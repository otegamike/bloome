import { NextResponse } from "next/server";

import { ApiError, handleRouteError } from "@/lib/apiErrors";
import {
  clientIp,
  isRegisterThrottled,
  recordRegisterAttempt,
} from "@/lib/authThrottle";
import { parseJsonBody } from "@/lib/requestParsing";
import { registerSchema } from "@/lib/shared/schemas";
import { createCredentialsUser } from "@/lib/userService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (await isRegisterThrottled(ip)) {
      throw new ApiError(429, "Too many attempts. Please try again later.");
    }
    await recordRegisterAttempt(ip);
    const input = await parseJsonBody(req, registerSchema);
    await createCredentialsUser(input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
