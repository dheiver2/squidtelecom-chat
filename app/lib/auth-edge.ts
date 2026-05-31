// ============================================================
// Versão Edge-compatible do readSession (Web Crypto API).
// Usada somente no /api/chat (Edge Runtime) para verificar
// a sessão sem depender do módulo Node.js `crypto`.
// ============================================================

const COOKIE = "a1_session";

async function hmacEdge(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  // base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Lê e valida a sessão via Web Crypto (compatível com Edge Runtime). */
export async function readSessionEdge(cookieHeader: string | null): Promise<string | null> {
  const secret = process.env.SESSION_SECRET || "";
  if (!cookieHeader || !secret) return null;

  const entry = cookieHeader.split(/; */).find((c) => c.startsWith(COOKIE + "="));
  if (!entry) return null;

  const token = decodeURIComponent(entry.slice(COOKIE.length + 1));
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacEdge(secret, payload);

  // Timing-safe compare via Web Crypto digest
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { u, exp } = JSON.parse(json);
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof u === "string" ? u : null;
  } catch {
    return null;
  }
}
