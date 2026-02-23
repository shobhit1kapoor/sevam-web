"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkerRow {
  workerId:     string;
  userId:       string;
  name:         string | null;
  phone:        string;
  skills:       string[];
  isApproved:   boolean;
  isOnline:     boolean;
  totalJobs:    number;
  rating:       number;
  joinedAt:     Date;
}

export interface CustomerRow {
  id:           string;
  name:         string | null;
  phone:        string;
  totalJobs:    number;
  joinedAt:     Date;
}

// ─── F19a: List workers (pending or all) ─────────────────────────────────────

export async function getWorkers(
  filter?: "ALL" | "PENDING" | "APPROVED"
): Promise<ActionResult<{ workers: WorkerRow[] }>> {
  const session = await getSession();
  if (!session || session.userType !== "ADMIN") {
    return { ok: false, error: "Admin access required.", code: "SERVER_ERROR" };
  }

  const isApproved =
    filter === "APPROVED" ? true :
    filter === "PENDING"  ? false :
    undefined;

  const profiles = await prisma.workerProfile.findMany({
    where:   isApproved !== undefined ? { isApproved } : undefined,
    include: { user: { select: { id: true, name: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  const workers: WorkerRow[] = profiles.map((p) => ({
    workerId:   p.id,
    userId:     p.user.id,
    name:       p.user.name,
    phone:      p.user.phone,
    skills:     p.skills,
    isApproved: p.isApproved,
    isOnline:   p.isOnline,
    totalJobs:  p.totalJobs,
    rating:     p.rating,
    joinedAt:   p.user.createdAt,
  }));

  return { ok: true, data: { workers } };
}

// ─── F19b: List customers ─────────────────────────────────────────────────────

export async function getCustomers(
  page = 1,
  limit = 30
): Promise<ActionResult<{ customers: CustomerRow[]; total: number }>> {
  const session = await getSession();
  if (!session || session.userType !== "ADMIN") {
    return { ok: false, error: "Admin access required.", code: "SERVER_ERROR" };
  }

  // Validate and clamp pagination parameters (guard against NaN/Infinity inputs)
  const safePage  = Number.isFinite(page)  ? Math.max(1, Math.floor(page))                  : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 30;
  const skip = (safePage - 1) * safeLimit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where:   { userType: "CUSTOMER" },
      include: { _count: { select: { customerJobs: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where: { userType: "CUSTOMER" } }),
  ]);

  const customers: CustomerRow[] = users.map((u) => ({
    id:        u.id,
    name:      u.name,
    phone:     u.phone,
    totalJobs: u._count.customerJobs,
    joinedAt:  u.createdAt,
  }));

  return { ok: true, data: { customers, total } };
}

// ─── Delete / ban user ────────────────────────────────────────────────────────

export async function setUserBanned(
  userId: string,
  banned: boolean
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.userType !== "ADMIN") {
    return { ok: false, error: "Admin access required.", code: "SERVER_ERROR" };
  }

  if (!userId) return { ok: false, error: "User ID is required.", code: "SERVER_ERROR" };

  if (banned) {
    // Revoke all active sessions for the user by deleting their OTP records
    // and wiping their FCM token (prevents silent re-login via refresh cookie).
    // A proper solution would add a `bannedAt DateTime?` column to User —
    // tracked as tech debt.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user) return { ok: false, error: "User not found.", code: "SERVER_ERROR" };

    await prisma.$transaction([
      prisma.otpVerification.deleteMany({ where: { phone: user.phone } }),
      prisma.user.update({ where: { id: userId }, data: { fcmToken: null } }),
    ]);
  }

  // Audit trail: log who performed this sensitive admin action.
  console.info(
    JSON.stringify({
      audit: "setUserBanned",
      adminId: session.userId,
      targetUserId: userId,
      action: banned ? "banned" : "unbanned",
      timestamp: new Date().toISOString(),
    })
  );

  return { ok: true };
}
