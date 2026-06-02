// ============================================================
// Planejador de buscas (etapa 2). Dada a pergunta do usuário, pede ao modelo
// (provedor compatível com OpenAI — ex.: Hugging Face) de 1 a 3 sub-queries
// específicas. Como o modelo é
// pequeno e pode devolver JSON imperfeito, a extração é tolerante e SEMPRE há
// fallback para a pergunta original — a busca nunca quebra por causa do plano.
// ============================================================

const MAX_QUERIES = 3;
const PLAN_TIMEOUT_MS = 8000;

const PLANNER_SYSTEM =
  "Você é um planejador de buscas na web. Dada a pergunta do usuário, gere de 1 a 3 " +
  "consultas de busca curtas, específicas e diversas (em português, salvo se a pergunta " +
  "exigir outro idioma) que, somadas, ajudem a responder. Responda APENAS com um array " +
  'JSON de strings, sem texto extra. Exemplo: ["preço médio notebook i5 2025", "melhores notebooks custo-benefício"].';

/** Normaliza uma query candidata. */
function clean(q: unknown): string {
  return String(q ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Extrai um array de strings de uma resposta possivelmente "suja" do modelo. */
function parseQueries(text: string): string[] {
  // 1) tenta achar o primeiro array JSON na resposta
  const match = text.match(/\[[\s\S]*?\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        const qs = arr.map(clean).filter(Boolean);
        if (qs.length) return qs;
      }
    } catch { /* cai para o modo linha-a-linha */ }
  }
  // 2) fallback: uma query por linha (remove marcadores/aspas)
  return text
    .split("\n")
    .map((l) => clean(l.replace(/^[\s\-*\d.)"']+/, "").replace(/["']+$/, "")))
    .filter(Boolean);
}

/** Deduplica preservando ordem (case-insensitive). */
function dedupe(qs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of qs) {
    const k = q.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(q); }
  }
  return out;
}

/** Gera de 1 a 3 sub-queries para a pergunta. Sempre retorna ao menos uma. */
export async function planQueries(question: string): Promise<string[]> {
  const fallback = [clean(question).slice(0, 120) || question.slice(0, 120)];

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "";
  const apiKey = process.env.OPENAI_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLAN_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.2,
        messages: [
          { role: "system", content: PLANNER_SYSTEM },
          { role: "user", content: question.slice(0, 1000) },
        ],
        max_tokens: 256,
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content || "";
    const qs = dedupe(parseQueries(text)).slice(0, MAX_QUERIES);
    return qs.length ? qs : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
