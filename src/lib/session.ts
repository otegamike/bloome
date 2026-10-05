import "server-only";

import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/apiErrors";

/**
 * The Mongo user id for this request, taken only from the Auth.js session.
 * Never from bodies, params, or query strings. A malformed id (for example
 * a provider profile id from an old token) reads as signed-out, so the next
 * login mints a clean session instead of crashing the route.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.userId || !Types.ObjectId.isValid(session.userId)) {
    throw unauthorized();
  }
  return session.userId;
}
