import { env } from "../env";

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
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
