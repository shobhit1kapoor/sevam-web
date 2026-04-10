import type { NextRequest } from "next/server";
import { z } from "zod";
import { AddressLabel } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireCustomerUserFromRequest } from "@/lib/server/auth/customer-api-auth";
import { badRequest, getRequestId, internalError, notFound, ok } from "@/lib/server/api/http";

type AddressBody = {
  id?: string;
  label?: "HOME" | "OFFICE" | "OTHER";
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
};

const PincodeSchema = z.string().trim().regex(/^\d{6}$/, "pincode must be a 6 digit code");

const AddressCreateSchema = z.object({
  label: z.enum(["HOME", "OFFICE", "OTHER"]).optional(),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: PincodeSchema,
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

const AddressUpdateSchema = z.object({
  id: z.string().trim().min(1),
  label: z.enum(["HOME", "OFFICE", "OTHER"]).optional(),
  line1: z.string().trim().min(3).max(160).optional(),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  pincode: PincodeSchema.optional(),
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

function normalizeLabel(label?: string): AddressLabel {
  if (label === "OFFICE") return AddressLabel.OFFICE;
  if (label === "OTHER") return AddressLabel.OTHER;
  return AddressLabel.HOME;
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user } = auth;

    const addresses = await prisma.customerAddress.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        line1: true,
        line2: true,
        landmark: true,
        city: true,
        state: true,
        pincode: true,
        lat: true,
        lng: true,
        isDefault: true,
      },
    });

    return ok({ addresses }, requestId);
  } catch {
    return internalError("Failed to load addresses", requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user } = auth;

    const payload = (await req.json().catch(() => ({}))) as AddressBody;
    const parsedBody = AddressCreateSchema.safeParse(payload);
    if (!parsedBody.success) {
      return badRequest(parsedBody.error.issues[0]?.message ?? "Invalid payload", requestId);
    }
    const body = parsedBody.data;

    const line1 = body.line1;
    const city = body.city;
    const state = body.state;
    const pincode = body.pincode;

    const label = normalizeLabel(body.label);
    const line2 = body.line2?.trim() || null;
    const landmark = body.landmark?.trim() || null;
    const lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
    const lng = Number.isFinite(body.lng) ? Number(body.lng) : null;
    const makeDefault = Boolean(body.isDefault);

    const created = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: user.id, isActive: true, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId: user.id,
          label,
          line1,
          line2,
          landmark,
          city,
          state,
          pincode,
          lat,
          lng,
          isDefault: makeDefault,
        },
        select: {
          id: true,
          label: true,
          line1: true,
          line2: true,
          landmark: true,
          city: true,
          state: true,
          pincode: true,
          lat: true,
          lng: true,
          isDefault: true,
        },
      });
    });

    return ok({ address: created }, requestId, 201);
  } catch {
    return internalError("Failed to create address", requestId);
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

    const payload = (await req.json().catch(() => ({}))) as AddressBody;
    const parsedBody = AddressUpdateSchema.safeParse(payload);
    if (!parsedBody.success) {
      return badRequest(parsedBody.error.issues[0]?.message ?? "Invalid payload", requestId);
    }
    const body = parsedBody.data;
    const id = body.id;

    const existing = await prisma.customerAddress.findFirst({
      where: {
        id,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!existing) {
      return notFound("Address not found", requestId);
    }

    const updates: {
      label?: AddressLabel;
      line1?: string;
      line2?: string | null;
      landmark?: string | null;
      city?: string;
      state?: string;
      pincode?: string;
      lat?: number | null;
      lng?: number | null;
      isDefault?: boolean;
    } = {};

    if (body.label) updates.label = normalizeLabel(body.label);
    if (typeof body.line1 === "string") updates.line1 = body.line1.trim();
    if (typeof body.line2 === "string") updates.line2 = body.line2.trim() || null;
    if (typeof body.landmark === "string") updates.landmark = body.landmark.trim() || null;
    if (typeof body.city === "string") updates.city = body.city.trim();
    if (typeof body.state === "string") updates.state = body.state.trim();
    if (typeof body.pincode === "string") updates.pincode = body.pincode.trim();
    if (Object.hasOwn(body, "lat")) updates.lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
    if (Object.hasOwn(body, "lng")) updates.lng = Number.isFinite(body.lng) ? Number(body.lng) : null;

    const makeDefault = body.isDefault === true;

    const updated = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: user.id, isActive: true, isDefault: true },
          data: { isDefault: false },
        });
        updates.isDefault = true;
      }

      return tx.customerAddress.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          label: true,
          line1: true,
          line2: true,
          landmark: true,
          city: true,
          state: true,
          pincode: true,
          lat: true,
          lng: true,
          isDefault: true,
        },
      });
    });

    return ok({ address: updated }, requestId);
  } catch {
    return internalError("Failed to update address", requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const auth = await requireCustomerUserFromRequest(req, requestId);
    if (!auth.ok) {
      return auth.response;
    }

    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return badRequest("Address id is required", requestId);
    }

    const existing = await prisma.customerAddress.findFirst({
      where: {
        id,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!existing) {
      return notFound("Address not found", requestId);
    }

    await prisma.customerAddress.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    });

    return ok({ ok: true }, requestId);
  } catch {
    return internalError("Failed to delete address", requestId);
  }
}
