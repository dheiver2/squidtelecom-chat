// ============================================================
// Extração leve de texto de páginas (sem jsdom/readability — evita deps
// pesadas e cold start alto no serverless). Não é perfeito, mas entrega o
// texto principal suficiente para o LLM ler e citar. Uso server-side (Node).
// ============================================================

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1_500_000; // não baixa páginas gigantes
const MAX_TEXT_CHARS = 2500;      // texto por fonte enviado ao modelo

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
          "Mozilla/5.0 (compatible; Alpha1Assistant/1.0; +https://alpha1.local)",
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
