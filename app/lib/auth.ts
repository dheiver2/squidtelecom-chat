// ============================================================
// Autenticação: sessão cookie httpOnly + bcrypt para senhas
// Migração transparente: logins com hash HMAC antigo são
// re-hasheados com bcrypt automaticamente no próximo login.
// ============================================================
import crypto from "crypto";
import bcrypt from "bcryptjs";

const SECRET = process.env.SESSION_SECRET || "";
const COOKIE = "a1_session";

// Validação LAZY (em tempo de request, não no import — senão o `next build`,
// que importa as rotas com NODE_ENV=production, quebraria sem a env setada).
// Sem um segredo forte os tokens poderiam ser forjados (HMAC com chave vazia).
function assertSecret(): void {
  if (process.env.NODE_ENV === "production" && SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou muito curto (mínimo 32 caracteres) — configure nas env vars."
    );
  }
}
const MAX_AGE = 60 * 60 * 12; // 12 horas
const BCRYPT_ROUNDS = 12;

// ---- HMAC interno (somente para migração e sessão) ----
function hmac(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

// ---- Senhas (bcrypt) ----

/** Cria hash bcrypt de uma senha (novo padrão). */
export async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Verifica senha contra o hash armazenado.
 *  Suporta bcrypt ($2b$…) e HMAC legado (migração transparente).
 *  Retorna { valid, needsRehash } — se needsRehash=true o chamador deve
 *  salvar um novo hash bcrypt no banco. */
export async function verifyPassword(
  username: string,
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$")) {
    // Hash moderno — bcrypt
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }
  // Hash legado — HMAC (migra para bcrypt no próximo login)
  const legacyHash = hmac(`pw:${username}:${password}`);
  const a = Buffer.from(storedHash);
  const b = Buffer.from(legacyHash);
  const valid =
    a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid }; // se válido, pede rehash
}

/** @deprecated Somente para migração. Não usar em novos cadastros. */
export function hashPassword(username: string, password: string): string {
  return hmac(`pw:${username}:${password}`);
}

// ---- Sessão ----

export function createSessionToken(username: string): string {
  assertSecret();
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

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
