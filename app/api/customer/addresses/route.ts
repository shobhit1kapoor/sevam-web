// @ts-nocheck
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AddressLabel } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase-server";

type AddressBody = {
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

export async function GET() {
  return NextResponse.json({ addresses: [] });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
  state?: string;