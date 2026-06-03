// Node.js runtime: usa duck-duck-scrape (não compatível com Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { search, SafeSearchType } from "duck-duck-scrape";
import { readSession } from "../../lib/auth";
import type { SearchResult } from "../../lib/search";
import { fetchAndExtract, selectRelevant } from "../../lib/extract";
import { planQueries } from "../../lib/search-plan";

// Chars de conteúdo relevante enviados ao modelo por fonte (após o rerank).
const RELEVANT_CHARS = 900;

// Quantas páginas abrir e LER de fato (além do snippet). Baixo para não
// estourar a latência — a leitura é paralela, mas cada fetch tem custo.
const READ_TOP_N = 4;
// Resultados por sub-query antes do merge, e total após dedupe.
const PER_QUERY = 4;
const MAX_MERGED = 6;

/** Normaliza a URL para dedupe (sem fragmento, sem barra final, host minúsculo). */
function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let s = url.toString();
    return s.endsWith("/") ? s.slice(0, -1) : s;
  } catch {
    return u;
  }
}

export async function GET(req: Request) {
  // Apenas usuários autenticados podem buscar
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return Response.json({ results: [] });

  try {
    // Etapa 2: planeja 1–3 sub-queries (com fallback para a pergunta original).
    const queries = await planQueries(q);

    // Busca cada sub-query em paralelo (falha individual vira lista vazia).
    const perQuery = await Promise.all(
      queries.map(async (query) => {
        try {
          const raw = await search(query, { safeSearch: SafeSearchType.OFF });
          return (raw.results || []).slice(0, PER_QUERY);
        } catch {
          return [];
        }
      })
    );

    // Merge intercalado (round-robin) para diversificar, e dedupe por URL.
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    const maxLen = Math.max(0, ...perQuery.map((p) => p.length));
    for (let i = 0; i < maxLen && merged.length < MAX_MERGED; i++) {
      for (const list of perQuery) {
        const r = list[i];
        if (!r || !r.url) continue;
        const key = normalizeUrl(r.url);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ title: r.title || "", url: r.url, description: r.description || "" });
        if (merged.length >= MAX_MERGED) break;
      }
    }

    // Lê o conteúdo real das primeiras páginas (em paralelo). Falhas individuais
    // não derrubam a busca — a fonte simplesmente fica só com o snippet.
    await Promise.all(
      merged.slice(0, READ_TOP_N).map(async (r) => {
        const content = await fetchAndExtract(r.url);
        // Rerank: envia ao modelo só os trechos relevantes à pergunta (economia
        // de tokens) em vez da página inteira.
        if (content) r.content = selectRelevant(content, q, RELEVANT_CHARS);
      })
    );

    return Response.json({ results: merged, queries });
  } catch (e) {
    console.error("search error", e);
    // Retorna vazio em vez de erro — o chat segue sem busca
    return Response.json({ results: [] });
  }
}
