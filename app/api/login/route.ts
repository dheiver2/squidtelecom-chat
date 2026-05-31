export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyPassword, hashPasswordBcrypt, createSessionToken, sessionCookie } from "../../lib/auth";
import { findUser, updatePasswordHash } from "../../lib/db";
import { rateLimit, LIMITS, getIp, tooManyRequests } from "../../lib/ratelimit";

export async function POST(req: Request) {
  // Rate limiting: 5 tentativas / 15 min por IP
  const ip = getIp(req);
  const rl = await rateLimit(`login:${ip}`, LIMITS.login.limit, LIMITS.login.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch { /* tratado abaixo */ }

  if (!username || !password) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
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
    return new Response(JSON.stringify({ user: username }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
    });
  } catch (e) {
    console.error("login error", e);
    return Response.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
