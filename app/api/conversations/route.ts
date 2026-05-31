export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";
import { listConversations, upsertConversation, migrateConversations } from "../../lib/db";

export async function GET(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    await migrateConversations();
    const conversations = await listConversations(username);
    return Response.json({ conversations });
  } catch (e) {
    console.error("list conversations error", e);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id, title, messages, model } = await req.json();
    if (!id || typeof id !== "string") return Response.json({ error: "id inválido" }, { status: 400 });
    await migrateConversations();
    await upsertConversation(id, username, title || "Nova conversa", messages || [], model ?? null);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("create conversation error", e);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
