import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCustomerUserFromRequest } from "@/lib/server/auth/customer-api-auth";
import { badRequest, getRequestId, internalError, ok } from "@/lib/server/api/http";

type ProfileBody = {
  name?: string;
  email?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredLanguage?: string | null;
  marketingOptIn?: boolean;
};

const ProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal(""), z.undefined()]),
  dateOfBirth: z.union([z.string().trim().max(32), z.null(), z.undefined()]),
  gender: z.union([z.string().trim().max(32), z.null(), z.undefined()]),
  preferredLanguage: z.union([z.string().trim().min(2).max(10), z.null(), z.undefined()]),
  marketingOptIn: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user, supabaseUser } = auth;

    const profile = await prisma.customerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: supabaseUser.email ?? null,
      },
      update: {
        email: supabaseUser.email ?? undefined,
      },
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
      },
      profile: {
        email: profile.email,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        preferredLanguage: profile.preferredLanguage,
        marketingOptIn: profile.marketingOptIn,
      },
    }, requestId);
  } catch {
    return internalError("Failed to load profile", requestId);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user } = auth;
    const payload = (await req.json().catch(() => ({}))) as ProfileBody;
    const parsedBody = ProfileBodySchema.safeParse(payload);
    if (!parsedBody.success) {
      return badRequest(parsedBody.error.issues[0]?.message ?? "Invalid payload", requestId);
    }
    const body = parsedBody.data;

    const name = body.name?.trim();
    if (name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    const dateOfBirthRaw = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
    let dateOfBirth: Date | null = null;

    if (dateOfBirthRaw) {
      const parsedDate = new Date(dateOfBirthRaw);
      if (Number.isNaN(parsedDate.getTime())) {
        return badRequest("Invalid dateOfBirth", requestId);
      }
      dateOfBirth = parsedDate;
    }

    const profile = await prisma.customerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: body.email?.trim() || null,
        dateOfBirth,
        gender: body.gender?.trim() || null,
        preferredLanguage: body.preferredLanguage?.trim() || "en",
        marketingOptIn: Boolean(body.marketingOptIn),
      },
      update: {
        email: body.email?.trim() || null,
        dateOfBirth,
        gender: body.gender?.trim() || null,
        preferredLanguage: body.preferredLanguage?.trim() || "en",
        marketingOptIn: Boolean(body.marketingOptIn),
      },
    });

    return ok({
      ok: true,
      profile: {
        email: profile.email,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        preferredLanguage: profile.preferredLanguage,
        marketingOptIn: profile.marketingOptIn,
      },
    }, requestId);
  } catch {
    return internalError("Failed to update profile", requestId);
  }
}