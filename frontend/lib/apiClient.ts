import { supabase } from "./supabaseClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_API_URL. Check frontend/.env.local against .env.local.example.",
  );
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Reads the current Supabase session and returns a fresh access token,
 * or null if the user isn't signed in. The Supabase client auto-refreshes
 * expired tokens under the hood, so this always returns the current one —
 * never a stale token from an earlier render.
 */
async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Failed to read Supabase session:", error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown; // pass a plain object; it gets JSON.stringify'd for you
  auth?: boolean; // default true — set false for public endpoints like /health
}

/**
 * Core request function. Every call to your FastAPI backend should go
 * through this (or the get/post/patch/del helpers below), never a raw fetch,
 * so that auth headers and error handling stay consistent everywhere.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      (finalHeaders as Record<string, string>)["Authorization"] =
        `Bearer ${token}`;
    }
    // If there's no token and the endpoint requires auth, FastAPI will
    // correctly reject with 401 — we don't need to guess here.
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : undefined) ??
      `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export { ApiError };
