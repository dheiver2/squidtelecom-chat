// ============================================================
// Busca na web via duck-duck-scrape (DuckDuckGo, sem API key)
// https://github.com/nicholascross/duck-duck-scrape
// ============================================================

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  /** Conteúdo principal extraído da página (quando a leitura foi bem-sucedida). */
  content?: string;
}

/** Formata resultados de busca como contexto para o LLM, no estilo "leia e cite".
 *  Cada fonte recebe um número [n]; o modelo é instruído a citar [n] inline. */
export function formatSearchContext(query: string, results: SearchResult[]): string {
  if (!results.length) return "";
  const blocks = results.map((r, i) => {
    const n = i + 1;
    const body = r.content && r.content.trim() ? r.content.trim() : r.description;
    return `[${n}] ${r.title}\nURL: ${r.url}\n${body}`;
  });
  return [
    `Você tem acesso a fontes da web para responder à pergunta: "${query}".`,
    "Use SOMENTE as informações das fontes abaixo para afirmações factuais e",
    "cite a fonte inline no formato [n] logo após cada afirmação que a utilize.",
    "Se as fontes não responderem à pergunta, diga isso claramente — não invente.",
    "",
    "=== FONTES ===",
    ...blocks,
    "=== FIM DAS FONTES ===",
    "",
  ].join("\n");
}
