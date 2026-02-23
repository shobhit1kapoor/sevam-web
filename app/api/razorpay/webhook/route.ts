import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyRazorpaySignature } from "@/lib/utils/razorpay";

export async function POST(req: NextRequest) {
  // Fail closed: never process a webhook if the secret is not configured.
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  // Verify webhook signature
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const isValid = verifyRazorpaySignature(rawBody, "", signature, webhookSecret);

  if (!isValid) {
    console.warn("[Razorpay Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string;

  if (eventType === "payment.captured") {
    const paymentEntity = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    const entity = paymentEntity?.entity as Record<string, unknown> | undefined;

    const razorpayPaymentId = entity?.id as string | undefined;
    const razorpayOrderId   = entity?.order_id as string | undefined;

    if (razorpayOrderId && razorpayPaymentId) {
      const payment = await prisma.payment.findFirst({ where: { razorpayOrderId } });
      if (!payment) {
        console.warn("[Razorpay Webhook] No payment record found for order:", razorpayOrderId);
      } else {
        try {
          await prisma.payment.update({
            where: { id: payment.id },
            data:  { status: "SUCCESS", razorpayPaymentId },
          });
        } catch (err) {
          console.error("[Razorpay Webhook] DB update failed for payment.captured:", err);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
      }
    }
  }

  if (eventType === "payment.failed") {
    const paymentEntity = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    const entity = paymentEntity?.entity as Record<string, unknown> | undefined;
    const razorpayOrderId = entity?.order_id as string | undefined;

    if (razorpayOrderId) {
      const payment = await prisma.payment.findFirst({ where: { razorpayOrderId } });
      if (payment) {
        // Never downgrade a payment that already succeeded.
        if (payment.status === "SUCCESS") {
          console.warn("[Razorpay Webhook] Ignoring payment.failed for already-captured order:", razorpayOrderId);
        } else {
          try {
            await prisma.payment.update({
              where: { id: payment.id },
              data:  { status: "FAILED" },
            });
          } catch (err) {
            console.error("[Razorpay Webhook] DB update failed for payment.failed:", err);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
