import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Stub — implemented in backend.md.
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
