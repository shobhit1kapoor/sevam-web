// @ts-nocheck
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AddressLabel } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase-server";

type UpdateAddressBody = {
  label?: "HOME" | "OFFICE" | "OTHER";
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export async function PATCH() {
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
  state?: string;