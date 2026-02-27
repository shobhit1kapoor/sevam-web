"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateReviewInput {
  jobId:   string;
  /** Integer 1–5 star rating. */
  rating:  number;
  comment?: string;
}

// ─── Create review ────────────────────────────────────────────────────────────

/**
 * Submit a review for a completed job.
 *
 * - Only the customer who booked the job may review it.
 * - The job must be in COMPLETED status.
 * - Only one review per job is allowed.
 * - After saving the review the worker's aggregate rating is recalculated.
 */
export async function createReview(
  input: CreateReviewInput,
): Promise<ActionResult<{ reviewId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "CUSTOMER") return { ok: false, error: "Only customers can submit reviews.", code: "SERVER_ERROR" };

  const { jobId, rating, comment } = input;

  // Validate rating range
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be an integer between 1 and 5.", code: "SERVER_ERROR" };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { customerId: true, workerId: true, status: true, review: true },
  });

  if (!job)                             return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  if (job.status !== "COMPLETED")        return { ok: false, error: "You can only review a completed job.", code: "SERVER_ERROR" };
  if (job.review)                        return { ok: false, error: "You have already reviewed this job.", code: "SERVER_ERROR" };
  if (!job.workerId)                     return { ok: false, error: "No worker assigned to this job.", code: "SERVER_ERROR" };

  try {
    const review = await prisma.$transaction(async (tx) => {
      // Create the review
      const created = await tx.jobReview.create({
        data: {
          jobId,
          customerId: session.userId,
          workerId:   job.workerId!,
          rating,
          comment:    comment ?? null,
        },
      });

      // Recalculate worker's aggregate rating from all their reviews
      const agg = await tx.jobReview.aggregate({
        where:   { workerId: job.workerId! },
        _avg:    { rating: true },
        _count:  { rating: true },
      });

      await tx.workerProfile.update({
        where: { id: job.workerId! },
        data: {
          rating:    agg._avg.rating ?? 0,
          totalJobs: agg._count.rating,
        },
      });

      return created;
    });

    return { ok: true, data: { reviewId: review.id } };
  } catch (err) {
    captureError(err, { action: "createReview", jobId });
    return { ok: false, error: "Failed to submit review. Please try again.", code: "SERVER_ERROR" };
  }
}

// ─── Get reviews for a worker ────────────────────────────────────────────────

export interface WorkerReview {
  id:          string;
  rating:      number;
  comment:     string | null;
  customerName: string | null;
  createdAt:   Date;
}

export async function getWorkerReviews(
  workerId: string,
  limit = 10,
): Promise<ActionResult<WorkerReview[]>> {
  try {
    const reviews = await prisma.jobReview.findMany({
      where:   { workerId },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:        true,
        rating:    true,
        comment:   true,
        createdAt: true,
        customer:  { select: { name: true } },
      },
    });

    return {
      ok:   true,
      data: reviews.map((r) => ({
        id:           r.id,
        rating:       r.rating,
        comment:      r.comment,
        customerName: r.customer.name,
        createdAt:    r.createdAt,
      })),
    };
  } catch (err) {
    captureError(err, { action: "getWorkerReviews", extra: { workerId } });
    return { ok: false, error: "Failed to load reviews.", code: "SERVER_ERROR" };
  }
}
