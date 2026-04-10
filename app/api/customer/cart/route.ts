import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, customerCartLimiter } from '@/lib/utils/rate-limit';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const CART_COOKIE_KEY = 'sevam_service_cart_cookie';
const CART_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_RAW_CART_BYTES = 64 * 1024;
const MAX_CART_ITEMS = 100;
const MAX_ITEM_PRICE = 100000;
const MAX_ITEM_QUANTITY = 99;

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

function normalizeCart(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, MAX_CART_ITEMS)
    .map((item) => {
      const candidate = item as Partial<CartItem>;
      const parsedPrice = Number(candidate?.price ?? 0);
      const parsedQuantity = Number(candidate?.quantity ?? 0);
      return {
        id: String(candidate?.id ?? ''),
        name: String(candidate?.name ?? ''),
        price: Math.min(MAX_ITEM_PRICE, Math.max(0, parsedPrice)),
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(0, Math.trunc(parsedQuantity))),
      };
    })
    .filter(
      (item) =>
        Boolean(item.id) &&
        Boolean(item.name) &&
        Number.isFinite(item.price) &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    );
}

function summarize(items: CartItem[]) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { itemCount, subtotal };
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(customerCartLimiter, getClientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
        }
      );
    }

    const rawCookie = req.cookies.get(CART_COOKIE_KEY)?.value ?? '';
    const decoded = rawCookie ? decodeURIComponent(rawCookie) : '';
    const parsed = decoded ? JSON.parse(decoded) : [];
    const items = normalizeCart(parsed);

    return NextResponse.json({
      items,
      summary: summarize(items),
    });
  } catch {
    return NextResponse.json({ items: [], summary: { itemCount: 0, subtotal: 0 } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(customerCartLimiter, getClientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
        }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { raw?: string };
    const raw = body.raw ?? '[]';
    if (typeof raw !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid cart payload' }, { status: 400 });
    }
    if (raw.length > MAX_RAW_CART_BYTES) {
      return NextResponse.json({ ok: false, error: 'Cart payload too large' }, { status: 413 });
    }
    const parsed = JSON.parse(raw);
    const items = normalizeCart(parsed);

    const response = NextResponse.json({
      ok: true,
      summary: summarize(items),
    });

    response.cookies.set(CART_COOKIE_KEY, encodeURIComponent(JSON.stringify(items)), {
      path: '/',
      maxAge: CART_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid cart payload' }, { status: 400 });
  }
}
