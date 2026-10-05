import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { parseJsonBody } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { deleteAccountSchema, meUpdateSchema } from "@/lib/shared/schemas";
import { deleteAccount, getMe, updateMe } from "@/lib/userService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getMe(await requireUserId()));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseJsonBody(req, meUpdateSchema);
    return NextResponse.json(await updateMe(userId, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    await parseJsonBody(req, deleteAccountSchema);
    await deleteAccount(userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
