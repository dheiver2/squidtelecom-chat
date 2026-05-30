import crypto from "crypto";

// ============================================================
// Autenticação simples para uso corporativo (sem banco):
//  - Os 20 funcionários ficam em APP_USERS (env), como
//    { "usuario": "<hash da senha>" }.
//  - A sessão é um cookie httpOnly assinado com SESSION_SECRET.
//  - As conversas NÃO passam por aqui: ficam no dispositivo de
//    cada usuário. Esta camada só controla quem entra.
// ============================================================

const SECRET = process.env.SESSION_SECRET || "";
const COOKIE = "a1_session";
const MAX_AGE = 60 * 60 * 12; // 12 horas

function hmac(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

/** Gera o hash de uma senha (usado para montar APP_USERS). */
export function hashPassword(username: string, password: string): string {
  return hmac(`pw:${username}:${password}`);
}

function getUsers(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.APP_USERS || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!SECRET) return false;
  const stored = getUsers()[username];
  if (!stored) return false;
  const computed = hashPassword(username, password);
  const a = Buffer.from(stored);
  const b = Buffer.from(computed);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSessionToken(username: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

/** Lê e valida a sessão a partir do header Cookie. Retorna o usuário ou null. */
export function readSession(cookieHeader: string | null): string | null {
  if (!cookieHeader || !SECRET) return null;
  const entry = cookieHeader.split(/; */).find((c) => c.startsWith(COOKIE + "="));
  if (!entry) return null;
  const token = decodeURIComponent(entry.slice(COOKIE.length + 1));
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof u === "string" ? u : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
