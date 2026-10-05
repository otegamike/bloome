import "server-only";

import { Types } from "mongoose";
import type { z } from "zod";

import { ApiError, notFound } from "@/lib/apiErrors";

// Extraction only: read and validate, never write. Services do the writing.

/** Reject non-JSON mutation attempts before reading the body. */
export function requireJson(req: Request): void {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "Content-Type must be application/json");
  }
}

export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  requireJson(req);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(raw);
}

export function parseSearchParams<T>(url: URL, schema: z.ZodType<T>): T {
  const entries: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    entries[key] = value;
  });
  return schema.parse(entries);
}

/** Route id params carry no trust; unknown or malformed ids read as 404. */
export function parseIdParam(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw notFound("Not found");
  }
  return new Types.ObjectId(id);
}
