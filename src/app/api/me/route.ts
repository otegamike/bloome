import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { DATA_SCOPE, requireIdentity } from "@/lib/identity";
import { parseJsonBody } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { deleteAccountSchema, meUpdateSchema } from "@/lib/shared/schemas";
import { deleteAccount, getMe, updateMe } from "@/lib/userService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    return NextResponse.json(await getMe(userId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const input = await parseJsonBody(req, meUpdateSchema);
    return NextResponse.json(await updateMe(userId, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Account deletion stays on the web session: a phone can't wipe the account. */
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
