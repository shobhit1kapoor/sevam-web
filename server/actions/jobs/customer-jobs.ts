"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/auth";
import type { JobSummary, JobDetails } from "@/types/job";
import type { JobStatus } from "@/lib/generated/prisma/client";

// ─── B11a: List customer jobs ─────────────────────────────────────────────────

interface GetCustomerJobsInput {
  status?: JobStatus;
  page?: number;
  limit?: number;
}

export async function getCustomerJobs(
  input: GetCustomerJobsInput = {}
): Promise<ActionResult<{ jobs: JobSummary[]; total: number }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const { status, page = 1, limit = 20 } = input;
  // Clamp pagination inputs to prevent invalid skip or unbounded queries.
  const safePage  = Number.isFinite(page)  ? Math.max(1, Math.floor(page))                  : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 20;
  const skip = (safePage - 1) * safeLimit;

  const where = {
    customerId: session.userId,
    ...(status ? { status } : {}),
  };

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      include: {
        worker: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.job.count({ where }),
  ]);

  const summaries: JobSummary[] = jobs.map((j) => ({
    id:             j.id,
    type:           j.type,
    status:         j.status,
    address:        j.address,
    estimatedPrice: Number(j.estimatedPrice),
    finalPrice:     j.finalPrice !== null ? Number(j.finalPrice) : null,
    createdAt:      j.createdAt,
    worker: j.worker
      ? {
          name:     j.worker.user.name,
          phone:    j.worker.user.phone,
          rating:   j.worker.rating,
          photoUrl: j.worker.photoUrl,
        }
      : null,
  }));

  return { ok: true, data: { jobs: summaries, total } };
}

// ─── B11b: Get single job with tracking data ──────────────────────────────────

export async function getJobDetails(
  jobId: string
): Promise<ActionResult<JobDetails>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      worker: {
        include: { user: { select: { name: true, phone: true } } },
      },
      payment: {
        select: { id: true, status: true, amount: true, razorpayOrderId: true },
      },
    },
  });

  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };

  // Make sure the requester owns this job (or is an admin)
  if (session.userType === "CUSTOMER" && job.customerId !== session.userId) {
    return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  }
  if (session.userType === "WORKER" && job.worker?.userId !== session.userId) {
    return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  }

  const details: JobDetails = {
    id:             job.id,
    type:           job.type,
    status:         job.status,
    address:        job.address,
    lat:            job.lat,
    lng:            job.lng,
    description:    job.description,
    estimatedPrice: Number(job.estimatedPrice),
    finalPrice:     job.finalPrice !== null ? Number(job.finalPrice) : null,
    createdAt:      job.createdAt,
    acceptedAt:     job.acceptedAt,
    startedAt:      job.startedAt,
    completedAt:    job.completedAt,
    workerLat:      job.worker?.lat,
    workerLng:      job.worker?.lng,
    worker: job.worker
      ? {
          name:     job.worker.user.name,
          phone:    job.worker.user.phone,
          rating:   job.worker.rating,
          photoUrl: job.worker.photoUrl,
        }
      : null,
    payment: job.payment
      ? {
          id:              job.payment.id,
          status:          job.payment.status,
          amount:          Number(job.payment.amount),
          razorpayOrderId: job.payment.razorpayOrderId,
        }
      : null,
  };

  return { ok: true, data: details };
}
