import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { DATA_SCOPE, requireIdentity } from "@/lib/identity";
import { createPack, listPacks } from "@/lib/packService";
import { parseJsonBody } from "@/lib/requestParsing";
import { packCreateSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const packs = await listPacks(userId);
    return NextResponse.json({ packs });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const input = await parseJsonBody(req, packCreateSchema);
    const pack = await createPack(userId, input);
    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
