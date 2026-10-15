import { env } from "../env";
import { setItem } from "./storage";

export const REFRESH_KEY = "shelf.refresh_token";

export type Tokens = { token: string; refresh_token: string };
export type RefreshResult = "ok" | "invalid" | "offline";

let token: string | null = null;
let refreshToken: string | null = null;
let refreshing: Promise<RefreshResult> | null = null;
let onExpired: (() => void) | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  token = access;
  refreshToken = refresh;
}

export function getRefreshToken() {
  return refreshToken;
}

export function onSessionExpired(callback: (() => void) | null) {
  onExpired = callback;
}

export function refreshSession(): Promise<RefreshResult> {
  if (!refreshToken) return Promise.resolve("invalid");
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${env.apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return res.status === 401 ? "invalid" : "offline";
      const body: Tokens = await res.json();
      setTokens(body.token, body.refresh_token);
      await setItem(REFRESH_KEY, body.refresh_token);
      return "ok";
    } catch {
      return "offline";
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request(path: string, init: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${env.apiUrl}${path}`, { ...init, headers });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init);
  if (res.status === 401 && !path.startsWith("/auth/") && refreshToken) {
    const result = await refreshSession();
    if (result === "ok") res = await request(path, init);
    else if (result === "invalid") onExpired?.();
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.detail?.message || body?.detail || body?.message || message;
    } catch {}
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
