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

  // Base do motor (ex.: túnel HTTPS público apontando para o Mangaba do usuário).
  // OPENAI_BASE_URL termina em /v1; o endpoint de tags fica na raiz do host.
  const baseV1 = (process.env.OPENAI_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
  const root = baseV1.replace(/\/v1$/, "");

  try {
    const res = await fetch(`${root}/api/tags`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const names: string[] = (data.models || []).map((m: { name: string }) => m.name);
    if (names.length === 0) throw new Error();
    const real = pickModel(names);
    return Response.json({ online: true, model: brandModel(real) });
  } catch {
    return Response.json({ online: false, model: null });
  }
}
