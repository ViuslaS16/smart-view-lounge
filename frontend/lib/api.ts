/**
 * Base generic wrapper for all API fetch calls to the Node.js backend.
 * Stores JWT access token in localStorage and sends it as Authorization header.
 * Uses credentials: "include" so the server can also exchange refresh cookies.
 */

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  const port = process.env.NEXT_PUBLIC_API_PORT || "4000";
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${port}/api`;
  }
  return `http://localhost:${port}/api`;
};

// ─── Token Storage ────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sv_access_token");
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("sv_access_token", token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sv_access_token");
}

// ─── Token Refresh ────────────────────────────────────────────────────────────
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include", // sends the refresh_token cookie
      });
      if (!res.ok) {
        clearAccessToken();
        return null;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken as string;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

// ─── Main fetch wrapper ───────────────────────────────────────────────────────
export async function apiFetch(endpoint: string, options: RequestInit = {}, retry = true): Promise<any> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${getBaseUrl()}${path}`;

  const headers = new Headers(options.headers);
  if (!options.body || !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Attach JWT access token if present
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // keep for refresh cookie
  });

  // Auto-refresh on 401 (token expired), except for login/register endpoints where 401 means invalid credentials
  if (response.status === 401 && retry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry once with new token
      return apiFetch(endpoint, options, false);
    } else {
      // No refresh possible — redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  // On 403 'Admin access required' — clear token and redirect to login
  // This handles stale tokens from deleted/changed users
  if (response.status === 403) {
    const errData = response.headers.get('content-type')?.includes('application/json')
      ? await response.clone().json().catch(() => ({}))
      : {};
    if (errData?.error === 'Admin access required') {
      clearAccessToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data.error ? data.error : data || "An error occurred";
    throw new Error(message);
  }

  return data;
}

/** Specific common fetcher for GET requests */
export const fetcher = (url: string) => apiFetch(url, { method: "GET" });
