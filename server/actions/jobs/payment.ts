"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/utils/razorpay";
import type { ActionResult } from "@/types/auth";

// ─── Create Razorpay order ────────────────────────────────────────────────────

export async function createPaymentOrder(
  jobId: string
): Promise<ActionResult<{ orderId: string; amount: number; currency: string; keyId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });

  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  if (job.status !== "COMPLETED") return { ok: false, error: "Job must be completed before payment.", code: "SERVER_ERROR" };

  // If already paid, don't create a new order
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

    // Upsert payment record with order id
    await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount:         amountPaise / 100,
        razorpayOrderId: order.id,
        status:         "PENDING",
      },
      update: { razorpayOrderId: order.id, status: "PENDING" },
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
    console.error("[createPaymentOrder]", err);
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

  if (payment.status === "SUCCESS") {
    return { ok: false, error: "This job has already been paid for.", code: "SERVER_ERROR" };
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
    console.error("[verifyPayment] DB update failed:", err);
    return { ok: false, error: "Failed to record payment. Please contact support.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}
