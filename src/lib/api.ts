import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, verifyCsrf, type AuthUser } from "@/lib/auth";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Authenticates an API request; mutating verbs additionally require a CSRF token. */
export async function requireApiUser(request: Request): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Authentication required");

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const ok = await verifyCsrf(request);
    if (!ok) throw new HttpError(403, "Invalid CSRF token");
  }
  return user;
}

/** Wraps a route handler so thrown errors become clean JSON responses. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.status, error.message);
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    console.error("API error", error);
    return jsonError(500, "Unexpected server error");
  }
}
