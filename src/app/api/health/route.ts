import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Name and code only: error text can carry the connection string.
    const detail =
      error && typeof error === "object" && "code" in error
        ? `${(error as { name?: string }).name ?? "Error"} code=${String((error as { code?: unknown }).code)}`
        : "unreachable";
    console.error(`[health] database ${detail}`);
    return NextResponse.json({ ok: false, error: "Database unreachable" }, { status: 503 });
  }
}
