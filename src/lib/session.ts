import "server-only";

import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/apiErrors";

/**
 * The Mongo user id for this request, taken only from the Auth.js session.
 * Never from bodies, params, or query strings.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.userId) {
    throw unauthorized();
  }
  return session.userId;
}
