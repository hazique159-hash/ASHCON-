const API_BASE = "/api";

/** Access token is held in memory only — never localStorage (XSS exfiltration risk). */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

/** Thin fetch wrapper: attaches the bearer token and sends the refresh cookie. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `Request failed (${response.status})`,
      payload?.error?.code,
    );
  }

  return payload?.data as T;
}

/**
 * Single-flight token refresh.
 *
 * Refresh rotates the token, so two concurrent calls would present the same
 * token twice and trip the server's reuse detection. React StrictMode's
 * double-mount and any parallel 401 retries both cause exactly that, so all
 * callers share one in-flight request.
 */
let refreshInFlight: Promise<string> | null = null;

export function refreshSession(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = apiFetch<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      body: "{}",
    })
      .then((result) => {
        setAccessToken(result.accessToken);
        return result.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}
