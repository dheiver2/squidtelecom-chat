export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { hashPassword } from "../../lib/auth";
import { createUser, migrateDb, userExists } from "../../lib/db";

const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/;

export async function POST(req: Request) {
  let username: string, password: string;
  try {
    const body = await req.json();
    username = String(body.username || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!USERNAME_RE.test(username)) {
    return Response.json(
      { error: "Usuário deve ter 3–30 caracteres (letras minúsculas, números, _ . -)." },
      { status: 422 }
    );
  }
  if (password.length < 6) {
    return Response.json({ error: "Senha deve ter no mínimo 6 caracteres." }, { status: 422 });
  }

  try {
    await migrateDb(); // garante que a tabela existe (idempotente)
    if (await userExists(username)) {
      return Response.json({ error: "Nome de usuário já está em uso." }, { status: 409 });
    }
    await createUser(username, hashPassword(username, password));
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("register error", e);
    return Response.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
