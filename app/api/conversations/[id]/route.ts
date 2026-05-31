export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../../lib/auth";
import { upsertConversation, deleteConversationDb, migrateConversations } from "../../../lib/db";
import { validateConversationInput } from "../../../lib/conversation-validate";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { title, messages, model } = await req.json();
    let clean;
    try {
      clean = validateConversationInput(title, messages, model);
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 400 });
    }
    await migrateConversations();
    await upsertConversation(params.id, username, clean.title, clean.messages, clean.model);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("update conversation error", e);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const username = readSession(_req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    await deleteConversationDb(params.id, username);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("delete conversation error", e);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
