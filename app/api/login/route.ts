export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyPassword, hashPasswordBcrypt, createSessionToken, sessionCookie } from "../../lib/auth";
import { findUser, updatePasswordHash } from "../../lib/db";
import { rateLimit, LIMITS, getIp, tooManyRequests } from "../../lib/ratelimit";
import { isAllowedEmail, normalizeEmail, displayName } from "../../lib/allowlist";

export async function POST(req: Request) {
  const ip = getIp(req);

  let username = "";
  let password = "";
  try {
    const body = await req.json();
    // Login por e-mail (aceita `email` ou `username` por compatibilidade).
    username = normalizeEmail(body.email ?? body.username ?? "");
    password = String(body.password || "");
  } catch { /* tratado abaixo */ }

  if (!username || !password) {
    return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  // Rate limiting por IP + e-mail: protege cada conta contra força bruta sem
  // travar o escritório inteiro (vários funcionários saem pelo mesmo IP).
  const rl = await rateLimit(`login:${ip}:${username}`, LIMITS.login.limit, LIMITS.login.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);
  // Trava: somente e-mails autorizados (bloqueia até contas antigas fora da lista).
  if (!isAllowedEmail(username)) {
    return Response.json(
      { error: "Este e-mail não está autorizado a acessar a plataforma." },
      { status: 403 }
    );
  }

  try {
    const user = await findUser(username);
    if (!user) {
      return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }

    const { valid, needsRehash } = await verifyPassword(username, password, user.password_hash);
    if (!valid) {
      return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }

    // Migração transparente: re-hash HMAC legado → bcrypt
    if (needsRehash) {
      const newHash = await hashPasswordBcrypt(password);
      await updatePasswordHash(username, newHash).catch(() => {}); // não bloqueia o login
    }

    const token = createSessionToken(username);
    return new Response(JSON.stringify({ user: username, name: displayName(username) }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
    });
  } catch (e) {
    console.error("login error", e);
    return Response.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
