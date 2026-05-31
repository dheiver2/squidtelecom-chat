// ============================================================
// Busca na web via duck-duck-scrape (DuckDuckGo, sem API key)
// https://github.com/nicholascross/duck-duck-scrape
// ============================================================

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/** Formata resultados de busca como contexto para o LLM. */
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
