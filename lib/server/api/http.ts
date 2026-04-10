import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set('x-request-id', requestId);
  return response;
}

export function getRequestId(req: NextRequest) {
  const fromHeader = req.headers.get('x-request-id')?.trim();
  if (fromHeader) return fromHeader;
  return crypto.randomUUID();
}

export function ok<T extends JsonValue | Record<string, unknown>>(
  body: T,
  requestId: string,
  status = 200
) {
  return withRequestId(NextResponse.json(body, { status }), requestId);
}

export function badRequest(message: string, requestId: string) {
  return withRequestId(NextResponse.json({ error: message }, { status: 400 }), requestId);
}

export function unauthorized(requestId: string) {
  return withRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), requestId);
}

export function forbidden(requestId: string) {
  return withRequestId(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), requestId);
}

export function notFound(message: string, requestId: string) {
  return withRequestId(NextResponse.json({ error: message }, { status: 404 }), requestId);
}

export function tooManyRequests(requestId: string, retryAfter = 60) {
  return withRequestId(
    NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    ),
    requestId
  );
}

export function internalError(message: string, requestId: string) {
  return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
}
