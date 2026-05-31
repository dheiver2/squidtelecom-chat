// ============================================================
// Busca na web via Brave Search API
// Chave gratuita (2.000 buscas/mês) em: https://brave.com/search/api/
// Configure BRAVE_SEARCH_API_KEY nas env vars da Vercel.
// ============================================================

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string, count = 5): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=pt&country=BR&text_decorations=false`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      web?: { results?: Array<{ title: string; url: string; description?: string }> };
    };
    return (data.web?.results || []).slice(0, count).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));
  } catch {
    return [];
  }
}

/** Formata os resultados de busca como contexto para o LLM. */
export function formatSearchContext(query: string, results: SearchResult[]): string {
  if (!results.length) return "";
  const lines = [
    `[Resultados de busca na web para: "${query}"]`,
    "",
    ...results.map((r, i) =>
      `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`
    ),
    "",
    "---",
    "Use os resultados acima para embasar sua resposta. Cite as URLs relevantes.",
    "",
  ];
  return lines.join("\n");
}
