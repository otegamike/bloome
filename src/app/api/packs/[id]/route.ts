import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { deletePack, updatePack } from "@/lib/packService";
import { parseIdParam, parseJsonBody } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { packUpdateSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseJsonBody(req, packUpdateSchema);
    const pack = await updatePack(userId, parseIdParam(id), input);
    return NextResponse.json({ pack });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deletePack(userId, parseIdParam(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
