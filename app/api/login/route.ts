export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyCredentials, createSessionToken, sessionCookie } from "../../lib/auth";

export async function POST(req: Request) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch {
    /* corpo inválido tratado abaixo */
  }

  if (!username || !password || !verifyCredentials(username, password)) {
    return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = createSessionToken(username);
  return new Response(JSON.stringify({ user: username }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
  });
}
