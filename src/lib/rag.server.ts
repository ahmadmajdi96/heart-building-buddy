// Server-only helpers for the private RAG service.
// Never import from the browser bundle.

export const RAG_BASE_URL = (process.env.RAG_BASE_URL?.trim() || "http://70.30.221.109:50752").replace(/\/+$/, "");

export function getRagApiKey() {
  const key = process.env.RAG_API_KEY;
  if (!key) throw new Error("RAG service not configured. Missing RAG_API_KEY.");
  return key;
}

export function tenantIdForUser(userId: string) {
  return `user:${userId}`;
}

export async function ragFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", getRagApiKey());
  const res = await fetch(`${RAG_BASE_URL}${path}`, { ...init, headers });
  return res;
}
