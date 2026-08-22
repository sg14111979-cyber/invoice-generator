"use client";

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export interface ApiErrorShape {
  error: string;
  issues?: Record<string, string[] | undefined>;
}

export class ApiError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;
  constructor(status: number, body: ApiErrorShape) {
    super(body.error || "Request failed");
    this.status = status;
    this.issues = body.issues;
  }
}

/**
 * JSON fetch wrapper that attaches the double-submit CSRF token and turns
 * non-2xx responses into ApiError.
 */
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") headers["x-csrf-token"] = readCookie("ig_csrf");

  const response = await fetch(path, {
    method,
    headers,
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    throw new ApiError(response.status, data as ApiErrorShape);
  }
  return data as T;
}

export async function upload<T = unknown>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(path, {
    method: "POST",
    headers: { "x-csrf-token": readCookie("ig_csrf") },
    body: form,
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) throw new ApiError(response.status, data as ApiErrorShape);
  return data as T;
}
