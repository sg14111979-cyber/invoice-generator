import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ig_session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/invoices",
  "/customers",
  "/brands",
  "/settings",
  "/admin",
];

/**
 * Fast edge-level gate: bounces requests without a session cookie straight to
 * /login. Real session validation still happens server-side on every page and
 * API route, since a cookie alone proves nothing.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/customers/:path*",
    "/brands/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
