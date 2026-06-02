export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { brandModel, pickModel } from "../../lib/mangaba";
import { readSession } from "../../lib/auth";

export async function GET(req: Request) {
  if (!readSession(req.headers.get("cookie"))) {
    return new Response(JSON.stringify({ online: false, model: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Base do serviço de IA (endpoint compatível com OpenAI — ex.: Hugging Face).
  // Consultamos /v1/models com a mesma chave do /api/chat.
  const baseV1 = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY || "";
  const configured = process.env.OPENAI_MODEL;

  try {
    const res = await fetch(`${baseV1}/models`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    // OpenAI-compatible: { data: [{ id }] }
    const names: string[] = (data.data || []).map((m: { id: string }) => m.id);
    const real = configured || pickModel(names);
    if (!real) throw new Error();
    // Retorna também a lista completa de modelos disponíveis para o seletor
    return Response.json({
      online: true,
      model: brandModel(real),
      defaultModelId: real,
      models: names.map((id) => ({ id, label: brandModel(id) })),
    });
  } catch {
    return Response.json({ online: false, model: null });
  }
}
