// Node.js runtime: usa duck-duck-scrape (não compatível com Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { search, SafeSearchType } from "duck-duck-scrape";
import { readSession } from "../../lib/auth";
import type { SearchResult } from "../../lib/search";

export async function GET(req: Request) {
  // Apenas usuários autenticados podem buscar
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return Response.json({ results: [] });

  try {
    const raw = await search(q, {
      safeSearch: SafeSearchType.OFF,
    });

    const results: SearchResult[] = (raw.results || [])
      .slice(0, 5)
      .map((r) => ({
        title: r.title || "",
        url: r.url || "",
        description: r.description || "",
      }));

    return Response.json({ results });
  } catch (e) {
    console.error("search error", e);
    // Retorna vazio em vez de erro — o chat segue sem busca
    return Response.json({ results: [] });
  }
}
