import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/register", "/api/auth", "/api/health", "/api/register", "/api/cron"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons/")
  );
}

/**
 * Route guard (Next.js 16 `proxy` convention — the renamed `middleware`).
 * Signed-out visitors are sent to /login. Auth.js session cookies are
 * httpOnly, so this checks for their presence and lets the full session
 * check happen in pages and route handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isStaticAsset(pathname) || isPublic(pathname)) {
    return NextResponse.next();
  }
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)"],
};
