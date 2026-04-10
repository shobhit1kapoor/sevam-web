import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase-server";

type SyncBody = {
  name?: string;
  email?: string;
  phone?: string;
};

let dbSyncPausedUntil = 0;
const DB_SYNC_PAUSE_MS = 5 * 60 * 1000;

function normalizePhone(input?: string | null, fallbackUserId?: string) {
  const raw = (input ?? "").trim();
  if (raw) return raw;
  if (fallbackUserId) return `oauth_${fallbackUserId}`;
  return "";
}

function isSyntheticPhone(phone: string) {
  return phone.startsWith("oauth_");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: authUserData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUserData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SyncBody;
    const supabaseUser = authUserData.user;

    const name =
      body.name?.trim() ||
      (supabaseUser.user_metadata?.full_name as string | undefined) ||
      (supabaseUser.user_metadata?.name as string | undefined) ||
      "Customer";

    const email = body.email?.trim() || supabaseUser.email || "";
    const phoneFromUser = (supabaseUser.phone as string | undefined) ?? "";
    const phone = normalizePhone(phoneFromUser, supabaseUser.id);

    if (!phone) {
      return NextResponse.json({ error: "Phone resolution failed" }, { status: 400 });
    }

    const profile = {
      name,
      email,
      phone: isSyntheticPhone(phone) ? "" : phone,
    };

    if (Date.now() < dbSyncPausedUntil) {
      return NextResponse.json({
        user: null,
        profile,
        synced: false,
        reason: "db-temporarily-unavailable",
      });
    }

    try {
      const user = await prisma.user.upsert({
        where: { phone },
        create: {
          phone,
          name,
        },
        update: {
          name,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          userType: true,
          bannedAt: true,
        },
      });

      if (user.bannedAt) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          email: email || null,
        },
        update: {
          email: email || null,
        },
      });

      return NextResponse.json({
        user,
        profile,
        synced: true,
      });
    } catch {
      dbSyncPausedUntil = Date.now() + DB_SYNC_PAUSE_MS;
      return NextResponse.json({
        user: null,
        profile,
        synced: false,
        reason: "db-unreachable",
      });
    }
  } catch {
    return NextResponse.json({ error: "Something failed" }, { status: 500 });
  }
}
