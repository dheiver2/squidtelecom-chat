// ============================================================
// Extração leve de texto de páginas (sem jsdom/readability — evita deps
// pesadas e cold start alto no serverless). Não é perfeito, mas entrega o
// texto principal suficiente para o LLM ler e citar. Uso server-side (Node).
// ============================================================

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1_500_000; // não baixa páginas gigantes
const MAX_TEXT_CHARS = 8000;      // texto bruto extraído (material para o rerank)

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};

/** Converte HTML em texto principal aproximado. */
export function htmlToText(html: string): string {
  let s = html;
  // Remove blocos não-conteúdo inteiros.
  s = s.replace(/<(script|style|noscript|svg|head|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Comentários.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // Quebras de bloco viram newline para não grudar palavras.
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Remove o resto das tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decodifica entidades comuns + numéricas.
  s = s.replace(/&[a-z]+;|&#\d+;/gi, (m) => {
    if (ENTITIES[m]) return ENTITIES[m];
    const num = /^&#(\d+);$/.exec(m);
    if (num) { try { return String.fromCodePoint(parseInt(num[1], 10)); } catch { return " "; } }
    return " ";
  });
  // Colapsa espaços e linhas em branco.
  s = s.replace(/[ \t\f\v]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  return s.slice(0, MAX_TEXT_CHARS);
}

// ── Rerank lexical (economia de tokens) ─────────────────────────────────────
// Em vez de mandar a página inteira ao modelo, seleciona só os trechos mais
// relevantes à pergunta. BM25-ish simples, sem dependências nem custo de API.

const STOPWORDS = new Set(
  ("a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se " +
   "ao aos as os à às the of to and in for on is are que qual quais como onde quando " +
   "ou mais menos muito pouco ser estar tem ter sua seu suas seus este esta isso").split(" ")
);

/** Normaliza: minúsculo, sem acento. */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function terms(s: string): string[] {
  return norm(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Mantém só os trechos da página mais relevantes à consulta, até `maxChars`.
 *  Preserva a ordem original do texto. Se não houver termos, devolve o início. */
export function selectRelevant(content: string, query: string, maxChars = 900): string {
  if (content.length <= maxChars) return content;
  const qset = new Set(terms(query));
  if (qset.size === 0) return content.slice(0, maxChars);

  // Quebra em passagens (frases/linhas).
  const passages = content
    .split(/(?<=[.!?])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 40);
  if (passages.length === 0) return content.slice(0, maxChars);

  // Pontua cada passagem pela cobertura de termos da consulta (frequência +
  // diversidade de termos distintos cobertos).
  const scored = passages.map((p, i) => {
    const ts = terms(p);
    let hits = 0;
    const distinct = new Set<string>();
    for (const t of ts) if (qset.has(t)) { hits++; distinct.add(t); }
    const score = hits + distinct.size * 1.5;
    return { i, p, score };
  });

  // Seleciona as melhores até o teto de chars, depois reordena pela posição
  // original para o texto continuar legível.
  const chosen: { i: number; p: string }[] = [];
  let used = 0;
  for (const s of [...scored].sort((a, b) => b.score - a.score)) {
    if (s.score <= 0) break;
    if (used + s.p.length > maxChars && chosen.length) continue;
    chosen.push({ i: s.i, p: s.p });
    used += s.p.length + 1;
    if (used >= maxChars) break;
  }
  if (chosen.length === 0) return content.slice(0, maxChars);
  return chosen.sort((a, b) => a.i - b.i).map((c) => c.p).join(" … ").slice(0, maxChars);
}

/** Baixa uma URL e extrai o texto principal. Retorna "" em qualquer falha. */
export async function fetchAndExtract(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // UA de navegador — muitos sites bloqueiam clientes sem UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; SquidAssistant/1.0; +https://squid.local)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok || !ctype.includes("text/html")) return "";

    // Lê com teto de bytes para não estourar memória.
    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (bytes > MAX_HTML_BYTES) { try { await reader.cancel(); } catch {} break; }
    }
    return htmlToText(html);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}
