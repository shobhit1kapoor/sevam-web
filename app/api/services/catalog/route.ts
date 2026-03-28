import { NextResponse } from "next/server";
import { getServiceCatalog } from "@/lib/server/service-catalog";

export async function GET() {
  try {
    const catalog = await getServiceCatalog();
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ error: "Unable to load service catalog" }, { status: 500 });
  }
}
