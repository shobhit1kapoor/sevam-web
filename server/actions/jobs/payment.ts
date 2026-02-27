"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/utils/razorpay";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

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
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  // ── Idempotency: return cached order if the key already exists ──────────
  if (idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });
    if (existing?.razorpayOrderId && existing.status === "PENDING") {
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

  const amountPaise = Math.round(Number(job.finalPrice ?? job.estimatedPrice) * 100);

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  jobId,
    });

    await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount:          amountPaise / 100,
        razorpayOrderId: order.id,
        status:          "PENDING",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      update: {
        razorpayOrderId: order.id,
        status:          "PENDING",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

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
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const { jobId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

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
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "ADMIN") return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  const payment = await prisma.payment.findUnique({ where: { jobId } });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "SERVER_ERROR" };
  if (payment.status !== "SUCCESS") {
    return { ok: false, error: "Payment is not in SUCCESS state.", code: "SERVER_ERROR" };
  }
  if (!payment.razorpayPaymentId) {
    return { ok: false, error: "No Razorpay payment ID on record.", code: "SERVER_ERROR" };
  }

  const refundAmount = amountPaise ?? Math.round(Number(payment.amount) * 100);

  try {
    const razorpay = getRazorpay();
    const refund = await (razorpay.payments as unknown as {
      refund: (id: string, opts: { amount: number }) => Promise<{ id: string }>;
    }).refund(payment.razorpayPaymentId, { amount: refundAmount });

    await prisma.payment.update({
      where: { jobId },
      data: {
        status:           "REFUNDED",
        razorpayRefundId: refund.id,
      },
    });

    return { ok: true, data: { refundId: refund.id } };
  } catch (err) {
    captureError(err, { action: "issueRefund", jobId });
    return { ok: false, error: "Failed to issue refund. Please try again.", code: "SERVER_ERROR" };
  }
}
