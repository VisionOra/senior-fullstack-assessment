import { api, getRefreshToken, refreshSession, REFRESH_KEY, setTokens, Tokens } from "./api";
import { getItem, removeItem, setItem } from "./storage";

const EMAIL_KEY = "shelf.email";
const ONBOARDED_KEY = "shelf.onboarded";

export async function startSession(tokens: Tokens, email: string) {
  setTokens(tokens.token, tokens.refresh_token);
  await Promise.all([setItem(REFRESH_KEY, tokens.refresh_token), setItem(EMAIL_KEY, email)]);
}

export async function restoreSession(): Promise<string | null> {
  const stored = await getItem(REFRESH_KEY);
  if (!stored) return null;
  setTokens(null, stored);
  const result = await refreshSession();
  if (result === "ok") return (await getItem(EMAIL_KEY)) ?? "";
  if (result === "invalid") await clearStored();
  setTokens(null, null);
  return null;
}

export async function endSession() {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) });
    } catch {}
  }
  setTokens(null, null);
  await clearStored();
}

async function clearStored() {
  await Promise.all([removeItem(REFRESH_KEY), removeItem(EMAIL_KEY)]);
}

export async function hasOnboarded() {
  return (await getItem(ONBOARDED_KEY)) === "1";
}

export async function markOnboarded() {
  await setItem(ONBOARDED_KEY, "1");
}
