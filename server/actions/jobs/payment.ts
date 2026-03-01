"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/utils/razorpay";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreatePaymentOrderSchema = z.object({
  jobId:          z.string().min(1, "jobId is required"),
  idempotencyKey: z.string().uuid().optional(),
});

const VerifyPaymentSchema = z.object({
  jobId:              z.string().min(1),
  razorpayOrderId:    z.string().min(1),
  razorpayPaymentId:  z.string().min(1),
  razorpaySignature:  z.string().min(1),
});

const IssueRefundSchema = z.object({
  jobId:       z.string().min(1, "jobId is required"),
  amountPaise: z.number().int().positive().optional(),
});

// ─── Create Razorpay order ────────────────────────────────────────────────────

/**
 * Creates a Razorpay order for a completed job.
 *
 * Pass `idempotencyKey` (e.g. a UUID generated on the client) to make
 * repeated calls safe on network retries — the same order is returned
 * without creating a duplicate on Razorpay.
 */
export async function createPaymentOrder(
  jobId: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ orderId: string; amount: number; currency: string; keyId: string }>> {
  // ── Zod validation ─────────────────────────────────────────────────────────
  const parsed = CreatePaymentOrderSchema.safeParse({ jobId, idempotencyKey });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  // Fetch job first — auth + ownership must be verified BEFORE idempotency cache
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });

  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  if (job.status !== "COMPLETED") return { ok: false, error: "Job must be completed before payment.", code: "SERVER_ERROR" };

  if (job.payment?.status === "SUCCESS") {
    return { ok: false, error: "This job has already been paid for.", code: "SERVER_ERROR" };
  }

  // ── Idempotency: return cached order if the key matches this job ────────
  if (idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      // Reject cross-job reuse of the same idempotency key regardless of status
      if (existing.jobId !== jobId) {
        return { ok: false, error: "Idempotency key is already associated with another job.", code: "SERVER_ERROR" };
      }
      if (existing.razorpayOrderId && existing.status === "PENDING") {
        return {
          ok: true,
          data: {
            orderId:  existing.razorpayOrderId,
            amount:   Math.round(Number(existing.amount) * 100),
            currency: "INR",
            keyId:    process.env.RAZORPAY_KEY_ID ?? "",
          },
        };
      }
    }
  }

  // ── If this job already has a pending payment (no idempotencyKey), reuse it
  if (job.payment?.razorpayOrderId && job.payment.status === "PENDING") {
    return {
      ok: true,
      data: {
        orderId:  job.payment.razorpayOrderId,
        amount:   Math.round(Number(job.payment.amount) * 100),
        currency: "INR",
        keyId:    process.env.RAZORPAY_KEY_ID ?? "",
      },
    };
  }

  const amountPaise = Math.round(Number(job.finalPrice ?? job.estimatedPrice) * 100);

  try {
    // Atomically claim the idempotency key / job slot BEFORE the provider call.
    // The unique constraint on idempotencyKey and jobId prevent two concurrent
    // requests from both proceeding past this point.
    const claimed = await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount:          amountPaise / 100,
        status:          "PENDING",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      update: {
        // Only claim if no order has been created yet
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    // If another request already created a Razorpay order, return it
    if (claimed.razorpayOrderId && claimed.status === "PENDING") {
      return {
        ok: true,
        data: {
          orderId:  claimed.razorpayOrderId,
          amount:   Math.round(Number(claimed.amount) * 100),
          currency: "INR",
          keyId:    process.env.RAZORPAY_KEY_ID ?? "",
        },
      };
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  jobId,
    });

    // Persist the Razorpay order ID — only if no other request beat us to it.
    const saved = await prisma.payment.updateMany({
      where: { jobId, razorpayOrderId: null },
      data:  { razorpayOrderId: order.id },
    });

    // If another request already set a different order, return that instead.
    if (saved.count === 0) {
      const current = await prisma.payment.findUnique({ where: { jobId } });
      if (current?.razorpayOrderId) {
        return {
          ok: true,
          data: {
            orderId:  current.razorpayOrderId,
            amount:   Math.round(Number(current.amount) * 100),
            currency: "INR",
            keyId:    process.env.RAZORPAY_KEY_ID ?? "",
          },
        };
      }
    }

    return {
      ok: true,
      data: {
        orderId:  order.id,
        amount:   amountPaise,
        currency: "INR",
        keyId:    process.env.RAZORPAY_KEY_ID ?? "",
      },
    };
  } catch (err) {
    captureError(err, { action: "createPaymentOrder", jobId });
    return { ok: false, error: "Failed to create payment order.", code: "SERVER_ERROR" };
  }
}

// ─── Verify payment ───────────────────────────────────────────────────────────

export async function verifyPayment(input: {
  jobId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult> {
  // ── Zod validation ─────────────────────────────────────────────────────────
  const parsed = VerifyPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const { jobId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  // SECURITY: Re-fetch the stored payment record and assert ownership +
  // order ID integrity before trusting the HMAC. This prevents an attacker
  // from replaying a valid signature for a different (cheaper) order.
  const payment = await prisma.payment.findUnique({ where: { jobId } });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { customerId: true } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  // Order ID must match what we stored when we created the order.
  if (payment.razorpayOrderId !== razorpayOrderId) {
    return { ok: false, error: "Order ID mismatch.", code: "SERVER_ERROR" };
  }

  // Idempotent success — already recorded on a previous call.
  if (payment.status === "SUCCESS") {
    return { ok: true };
  }

  const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    return { ok: false, error: "Payment verification failed. Please contact support.", code: "SERVER_ERROR" };
  }

  try {
    await prisma.payment.update({
      where: { jobId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: "SUCCESS",
      },
    });
  } catch (err) {
    captureError(err, { action: "verifyPayment", jobId });
    return { ok: false, error: "Failed to record payment. Please contact support.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}

// ─── Issue refund ─────────────────────────────────────────────────────────────

/**
 * Issue a full or partial refund for a paid job.
 * Only ADMIN users may call this action.
 *
 * @param jobId        The job whose payment should be refunded.
 * @param amountPaise  Amount to refund in paise (100 paise = ₹1).
 *                     Defaults to the full payment amount.
 */
export async function issueRefund(
  jobId: string,
  amountPaise?: number,
): Promise<ActionResult<{ refundId: string }>> {
  // ── Zod validation ─────────────────────────────────────────────────────────
  const parsed = IssueRefundSchema.safeParse({ jobId, amountPaise });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "ADMIN") return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  const payment = await prisma.payment.findUnique({ where: { jobId } });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "SERVER_ERROR" };

  // Idempotent: if a refund was already issued, return the existing refund ID.
  if (payment.status === "REFUNDED" && payment.razorpayRefundId) {
    return { ok: true, data: { refundId: payment.razorpayRefundId } };
  }

  if (payment.status !== "SUCCESS") {
    return { ok: false, error: "Payment is not in SUCCESS state.", code: "SERVER_ERROR" };
  }
  if (!payment.razorpayPaymentId) {
    return { ok: false, error: "No Razorpay payment ID on record.", code: "SERVER_ERROR" };
  }

  const maxRefundPaise = Math.round(Number(payment.amount) * 100);
  const refundAmount = amountPaise ?? maxRefundPaise;

  // Validate refund amount bounds
  if (refundAmount <= 0 || refundAmount > maxRefundPaise) {
    return {
      ok: false,
      error: `Refund amount must be between 1 and ${maxRefundPaise} paise.`,
      code: "SERVER_ERROR",
    };
  }

  try {
    // Atomically mark as FAILED to claim the refund slot. We use FAILED as
    // an intermediate "refund-requested" state. Only SUCCESS → FAILED
    // succeeds, so concurrent requests are blocked.
    const guard = await prisma.payment.updateMany({
      where: { jobId, status: "SUCCESS" },
      data:  { status: "FAILED" },
    });
    if (guard.count === 0) {
      return { ok: false, error: "Refund already in progress or status changed.", code: "SERVER_ERROR" };
    }

    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount,
    });

    // Provider succeeded — finalize to REFUNDED with the refund ID.
    await prisma.payment.update({
      where: { jobId },
      data:  { status: "REFUNDED", razorpayRefundId: refund.id },
    });

    return { ok: true, data: { refundId: refund.id } };
  } catch (err) {
    // Revert the intermediate FAILED state back to SUCCESS so the admin can
    // retry. Only revert if razorpayRefundId is still null (meaning the
    // provider call didn't actually succeed).
    await prisma.payment.updateMany({
      where: { jobId, status: "FAILED", razorpayRefundId: null },
      data:  { status: "SUCCESS" },
    }).catch(() => null);

    captureError(err, { action: "issueRefund", jobId });
    return { ok: false, error: "Failed to issue refund. Please try again.", code: "SERVER_ERROR" };
  }
}
