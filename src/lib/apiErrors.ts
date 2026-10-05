import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiErrorBody } from "@/types/api";

/** Typed HTTP error thrown from services; routes map it to a JSON response. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, message);
}

export function unauthorized(message = "Please log in"): ApiError {
  return new ApiError(401, message);
}

export function notFound(message = "Not found"): ApiError {
  return new ApiError(404, message);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, message);
}

export function unprocessable(message: string): ApiError {
  return new ApiError(422, message);
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

/** Single error funnel for every route handler. Never logs request bodies. */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = { error: error.message };
    return NextResponse.json(body, { status: error.status });
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      const list = fields[key] ?? [];
      list.push(issue.message);
      fields[key] = list;
    }
    const first = error.issues[0]?.message ?? "Invalid input";
    const body: ApiErrorBody = { error: first, fields };
    return NextResponse.json(body, { status: 400 });
  }
  if (isDuplicateKey(error)) {
    const body: ApiErrorBody = { error: "Already exists" };
    return NextResponse.json(body, { status: 409 });
  }
  console.error("[api]", error instanceof Error ? error.message : "Unknown error");
  const body: ApiErrorBody = { error: "Something went wrong" };
  return NextResponse.json(body, { status: 500 });
}
