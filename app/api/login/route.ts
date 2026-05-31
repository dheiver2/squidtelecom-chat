export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { hashPassword, createSessionToken, sessionCookie } from "../../lib/auth";
import { findUser, migrateDb } from "../../lib/db";

export async function POST(req: Request) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch { /* corpo inválido tratado abaixo */ }

  if (!username || !password) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  try {
    await migrateDb();
    const user = await findUser(username);
    if (!user) {
      return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }
    const hash = hashPassword(username, password);
    // timing-safe compare
    const a = Buffer.from(user.password_hash);
    const b = Buffer.from(hash);
    const valid = a.length === b.length &&
      require("crypto").timingSafeEqual(a, b);
    if (!valid) {
      return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
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
