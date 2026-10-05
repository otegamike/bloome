import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Database unreachable" }, { status: 503 });
  }
}
