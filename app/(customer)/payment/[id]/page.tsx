"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getJobDetails } from "@/server/actions/jobs/customer-jobs";
import { createPaymentOrder, verifyPayment } from "@/server/actions/jobs/payment";
import { Button, Card, CardContent, CardHeader, CardTitle, PageSpinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/pricing";
import type { JobDetails } from "@/types/job";

// Razorpay injects a global; minimal TS shim
declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [job,     setJob]     = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [paid,    setPaid]    = useState(false);

  const load = useCallback(async () => {
    const result = await getJobDetails(id);
    if (result.ok) {
      setJob(result.data);
      if (result.data.payment?.status === "SUCCESS") setPaid(true);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handlePay() {
    if (!job) return;
    setError(null);
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load payment gateway. Please check your connection.");
      setPaying(false);
      return;
    }

    const orderResult = await createPaymentOrder(id);
    if (!orderResult.ok) {
      setError(orderResult.error);
      setPaying(false);
      return;
    }

    const { orderId, amount, keyId } = orderResult.data;

    const rzp = new window.Razorpay({
      key:          keyId,
      amount,
      currency:     "INR",
      order_id:     orderId,
      name:         "Sevam",
      description:  `Payment for ${job.type.replace(/_/g, " ")} service`,
      theme:        { color: "#2563EB" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyResult = await verifyPayment({
          jobId:              id,
          razorpayOrderId:    response.razorpay_order_id,
          razorpayPaymentId:  response.razorpay_payment_id,
          razorpaySignature:  response.razorpay_signature,
        });

        if (verifyResult.ok) {
          setPaid(true);
          router.push("/jobs");
        } else {
          setError("Payment verification failed. Contact support.");
        }
        setPaying(false);
      },
      modal: {
        ondismiss: () => { setPaying(false); },
      },
    });

    rzp.open();
  }

  if (loading || !job) return <PageSpinner />;

  const amount = job.finalPrice ?? job.estimatedPrice;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-foreground">Payment</h1>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Service" value={job.type.replace(/_/g, " ")} />
          <Row label="Address" value={job.address} />
          <div className="border-t border-border pt-3">
            <Row label="Amount" value={formatPrice(amount)} bold />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Status:</span>
            <Badge variant={paid ? "success" : "warning"}>
              {paid ? "Paid" : "Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      {paid ? (
        <div className="rounded-xl bg-success/10 px-4 py-4 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="font-semibold text-success">Payment Successful!</p>
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={handlePay} isLoading={paying}>
          Pay {formatPrice(amount)}
        </Button>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
