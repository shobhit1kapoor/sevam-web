import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { supabaseAdmin } from '@/lib/db/supabase-server';
import { forbidden, unauthorized } from '@/lib/server/api/http';

type CustomerUser = {
  id: string;
  name: string | null;
  phone: string;
  userType: 'CUSTOMER' | 'WORKER' | 'ADMIN';
};

type RequireCustomerUserResult =
  | {
      ok: true;
      user: CustomerUser;
      supabaseUser: SupabaseUser;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function normalizePhone(input?: string | null, fallbackUserId?: string) {
  const raw = (input ?? '').trim();
  if (raw) return raw;
  if (fallbackUserId) return `oauth_${fallbackUserId}`;
  return '';
}

function parseBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

export async function requireCustomerUserFromRequest(
  req: NextRequest,
  requestId?: string
): Promise<RequireCustomerUserResult> {
  const rid = requestId ?? crypto.randomUUID();
  const token = parseBearerToken(req);
  if (!token) {
    return { ok: false, response: unauthorized(rid) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: unauthorized(rid) };
  }

  const supabaseUser = data.user;
  const phone = normalizePhone(supabaseUser.phone, supabaseUser.id);
  if (!phone) {
    return { ok: false, response: unauthorized(rid) };
  }

  const name =
    (supabaseUser.user_metadata?.full_name as string | undefined)?.trim() ||
    (supabaseUser.user_metadata?.name as string | undefined)?.trim() ||
    'Customer';

  const user = await prisma.user.upsert({
    where: { phone },
    create: {
      phone,
      name,
      userType: 'CUSTOMER',
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
    return { ok: false, response: forbidden(rid) };
  }

  if (!['CUSTOMER', 'WORKER', 'ADMIN'].includes(user.userType)) {
    return { ok: false, response: unauthorized(rid) };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      userType: user.userType,
    },
    supabaseUser,
  };
}
