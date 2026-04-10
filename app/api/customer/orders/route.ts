import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireCustomerUserFromRequest } from "@/lib/server/auth/customer-api-auth";
import { getRequestId, internalError, ok } from "@/lib/server/api/http";

function formatMoney(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "₹0";

  const hasFraction = Math.abs(parsed % 1) > Number.EPSILON;
  return `₹${parsed.toLocaleString("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user } = auth;

    const jobs = await prisma.job.findMany({
      where: {
        customerId: user.id,
        status: "COMPLETED",
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        completedAt: true,
        estimatedPrice: true,
        finalPrice: true,
        payment: {
          select: {
            amount: true,
          },
        },
        worker: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const orders = jobs.map((job) => {
      const amountSource = job.finalPrice ?? job.payment?.amount ?? job.estimatedPrice;
      const amountValue = typeof amountSource === "object" ? amountSource.toString() : String(amountSource);

      return {
        id: job.id,
        type: job.type,
        description: job.description,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt ? job.completedAt.toISOString() : null,
        providerName: job.worker?.user?.name || "Sevam Partner",
        totalPaid: formatMoney(amountValue),
      };
    });

    return ok({ orders }, requestId);
  } catch {
    return internalError("Failed to load orders", requestId);
  }
}
