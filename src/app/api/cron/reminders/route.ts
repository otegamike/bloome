import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Stub — secured with CRON_SECRET and implemented in backend.md.
// Called by an external scheduler (e.g. cron-job.org), not Vercel cron.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
