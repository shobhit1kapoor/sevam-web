"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/utils/razorpay";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

const ORDER_CREATE_CLAIM_PREFIX = "ORDER_CREATE_CLAIM:";
const REFUND_CLAIM_PREFIX = "REFUND_CLAIM:";

const CreatePaymentOrderSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  idempotencyKey: z.string().uuid().optional(),
});

const VerifyPaymentSchema = z.object({
  jobId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const IssueRefundSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  amountPaise: z.number().int().positive().optional(),
});

export async function createPaymentOrder(
  jobId: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ orderId: string; amount: number; currency: string; keyId: string }>> {
  const parsed = CreatePaymentOrderSchema.safeParse({ jobId, idempotencyKey });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });

  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  if (job.status !== "COMPLETED") return { ok: false, error: "Job must be completed before payment.", code: "SERVER_ERROR" };
  if (job.payment?.status === "SUCCESS" || job.payment?.status === "REFUNDED") {
    return { ok: false, error: "This job is not payable.", code: "SERVER_ERROR" };
  }

  if (idempotencyKey) {
    const existingByKey = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      if (existingByKey.jobId !== jobId) {
        return { ok: false, error: "Idempotency key is already associated with another job.", code: "SERVER_ERROR" };
      }
      if (
        existingByKey.razorpayOrderId &&
        existingByKey.status === "PENDING" &&
        !existingByKey.razorpayOrderId.startsWith(ORDER_CREATE_CLAIM_PREFIX)
      ) {
        return {
          ok: true,
          data: {
            orderId: existingByKey.razorpayOrderId,
            amount: Math.round(Number(existingByKey.amount) * 100),
            currency: "INR",
            keyId: process.env.RAZORPAY_KEY_ID ?? "",
          },
        };
      }
    }
  }

  if (
    job.payment?.razorpayOrderId &&
    job.payment.status === "PENDING" &&
    !job.payment.razorpayOrderId.startsWith(ORDER_CREATE_CLAIM_PREFIX)
  ) {
    return {
      ok: true,
      data: {
        orderId: job.payment.razorpayOrderId,
        amount: Math.round(Number(job.payment.amount) * 100),
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
      },
    };
  }

  const amountPaise = Math.round(Number(job.finalPrice ?? job.estimatedPrice) * 100);

  try {
    await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount: amountPaise / 100,
        status: "PENDING",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      update: {
        amount: amountPaise / 100,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    const claimToken = `${ORDER_CREATE_CLAIM_PREFIX}${crypto.randomUUID()}`;
    const claim = await prisma.payment.updateMany({
      where: { jobId, status: "PENDING", razorpayOrderId: null },
      data: { razorpayOrderId: claimToken },
    });

    if (claim.count === 0) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const current = await prisma.payment.findUnique({ where: { jobId } });
        if (current?.razorpayOrderId && !current.razorpayOrderId.startsWith(ORDER_CREATE_CLAIM_PREFIX)) {
          return {
            ok: true,
            data: {
              orderId: current.razorpayOrderId,
              amount: Math.round(Number(current.amount) * 100),
              currency: "INR",
              keyId: process.env.RAZORPAY_KEY_ID ?? "",
            },
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return { ok: false, error: "Payment order creation is in progress. Please retry.", code: "SERVER_ERROR" };
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: jobId,
    });

    const saved = await prisma.payment.updateMany({
      where: { jobId, status: "PENDING", razorpayOrderId: claimToken },
      data: { razorpayOrderId: order.id },
    });

    if (saved.count === 0) {
      const current = await prisma.payment.findUnique({ where: { jobId } });
      if (current?.razorpayOrderId && !current.razorpayOrderId.startsWith(ORDER_CREATE_CLAIM_PREFIX)) {
        return {
          ok: true,
          data: {
            orderId: current.razorpayOrderId,
            amount: Math.round(Number(current.amount) * 100),
            currency: "INR",
            keyId: process.env.RAZORPAY_KEY_ID ?? "",
          },
        };
      }
      return { ok: false, error: "Failed to persist payment order. Please retry.", code: "SERVER_ERROR" };
    }

    return {
      ok: true,
      data: {
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
      },
    };
  } catch (err) {
    await prisma.payment.updateMany({
      where: { jobId, razorpayOrderId: { startsWith: ORDER_CREATE_CLAIM_PREFIX } },
      data: { razorpayOrderId: null },
    }).catch(() => null);

    captureError(err, { action: "createPaymentOrder", jobId });
    return { ok: false, error: "Failed to create payment order.", code: "SERVER_ERROR" };
  }
}

export async function verifyPayment(input: {
  jobId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult> {
  const parsed = VerifyPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const { jobId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const payment = await prisma.payment.findUnique({ where: { jobId } });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { customerId: true } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  if (payment.razorpayOrderId !== razorpayOrderId) {
    return { ok: false, error: "Order ID mismatch.", code: "SERVER_ERROR" };
  }

  if (payment.status === "SUCCESS") {
    return { ok: true };
  }

  if (payment.status !== "PENDING") {
    return { ok: false, error: "Payment is not in a verifiable state.", code: "SERVER_ERROR" };
  }

  const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    return { ok: false, error: "Payment verification failed. Please contact support.", code: "SERVER_ERROR" };
  }

  try {
    const updated = await prisma.payment.updateMany({
      where: { jobId, status: "PENDING" },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: "SUCCESS",
      },
    });
    if (updated.count === 0) {
      return { ok: false, error: "Payment is no longer pending.", code: "SERVER_ERROR" };
    }
  } catch (err) {
    captureError(err, { action: "verifyPayment", jobId });
    return { ok: false, error: "Failed to record payment. Please contact support.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}

export async function issueRefund(
  jobId: string,
  amountPaise?: number,
): Promise<ActionResult<{ refundId: string }>> {
  const parsed = IssueRefundSchema.safeParse({ jobId, amountPaise });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "ADMIN") return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  const payment = await prisma.payment.findUnique({ where: { jobId } });
  if (!payment) return { ok: false, error: "Payment record not found.", code: "SERVER_ERROR" };

  if (payment.status === "REFUNDED" && payment.razorpayRefundId && !payment.razorpayRefundId.startsWith(REFUND_CLAIM_PREFIX)) {
    return { ok: true, data: { refundId: payment.razorpayRefundId } };
  }

  if (payment.razorpayRefundId?.startsWith(REFUND_CLAIM_PREFIX)) {
    return { ok: false, error: "Refund is already in progress. Please retry later.", code: "SERVER_ERROR" };
  }

  if (payment.status !== "SUCCESS") {
    return { ok: false, error: "Payment is not in SUCCESS state.", code: "SERVER_ERROR" };
  }
  if (!payment.razorpayPaymentId) {
    return { ok: false, error: "No Razorpay payment ID on record.", code: "SERVER_ERROR" };
  }

  const maxRefundPaise = Math.round(Number(payment.amount) * 100);
  const refundAmount = amountPaise ?? maxRefundPaise;

  if (refundAmount <= 0 || refundAmount > maxRefundPaise) {
    return {
      ok: false,
      error: `Refund amount must be between 1 and ${maxRefundPaise} paise.`,
      code: "SERVER_ERROR",
    };
  }

  const refundClaim = `${REFUND_CLAIM_PREFIX}${crypto.randomUUID()}`;

  try {
    const guard = await prisma.payment.updateMany({
      where: { jobId, status: "SUCCESS", razorpayRefundId: null },
      data: { razorpayRefundId: refundClaim },
    });

    if (guard.count === 0) {
      const current = await prisma.payment.findUnique({ where: { jobId } });
      if (current?.status === "REFUNDED" && current.razorpayRefundId && !current.razorpayRefundId.startsWith(REFUND_CLAIM_PREFIX)) {
        return { ok: true, data: { refundId: current.razorpayRefundId } };
      }
      return { ok: false, error: "Refund already in progress or status changed.", code: "SERVER_ERROR" };
    }

    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount,
    });

    const finalized = await prisma.payment.updateMany({
      where: { jobId, status: "SUCCESS", razorpayRefundId: refundClaim },
      data: { status: "REFUNDED", razorpayRefundId: refund.id },
    });
    if (finalized.count === 0) {
      return { ok: false, error: "Refund issued but finalization failed. Please contact support.", code: "SERVER_ERROR" };
    }

    return { ok: true, data: { refundId: refund.id } };
  } catch (err) {
    captureError(err, { action: "issueRefund", jobId });
    return { ok: false, error: "Failed to issue refund. Please try again.", code: "SERVER_ERROR" };
  }
}
