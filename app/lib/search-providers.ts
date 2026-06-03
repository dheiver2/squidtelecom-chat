// ============================================================
// Provedor de busca na web (server-side, Node).
// Preferência: TAVILY (confiável em serverless e já devolve o conteúdo da
// página) quando TAVILY_API_KEY está configurada. Caso contrário, cai para o
// DuckDuckGo (duck-duck-scrape) — que pode ser bloqueado em IPs de datacenter.
// ============================================================
import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

export interface RawResult {
  title: string;
  url: string;
  description: string;
  /** Conteúdo já extraído pelo provedor (Tavily). Quando ausente, o chamador lê a página. */
  content?: string;
}

const TAVILY_TIMEOUT_MS = 8000;

async function tavily(query: string, limit: number): Promise<RawResult[] | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: limit,
        search_depth: "basic",
        include_answer: false,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    return (data.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      description: (r.content || "").slice(0, 300),
      content: r.content || "",
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function ddg(query: string, limit: number): Promise<RawResult[]> {
  try {
    const raw = await ddgSearch(query, { safeSearch: SafeSearchType.OFF });
    return (raw.results || []).slice(0, limit).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));
  } catch {
    return [];
  }
}

/** Busca uma query no provedor preferencial; cai para o DuckDuckGo se preciso. */
export async function searchWeb(query: string, limit = 4): Promise<RawResult[]> {
  const t = await tavily(query, limit);
  if (t && t.length) return t;
  return ddg(query, limit);
}
