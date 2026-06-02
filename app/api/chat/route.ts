// Edge Runtime: sem cold start (~200-500ms poupados por request),
// executa na rede da Vercel mais próxima do usuário.
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { readSessionEdge } from "../../lib/auth-edge";
import { rateLimit, LIMITS, tooManyRequests } from "../../lib/ratelimit";
import { formatSearchContext } from "../../lib/search";
import type { SearchResult } from "../../lib/search";

const SYSTEM_PROMPT =
  "Você é o Alpha1 Assistant, o assistente virtual inteligente da Alpha 1 Consultoria — " +
  "empresa de telecomunicações, gestão e tecnologia da informação que atende empresas em todo o Brasil. " +
  "Responda sempre em português do Brasil, de forma clara, profissional e prestativa. " +
  "Use markdown quando ajudar na leitura.\n\n" +
  "GERAÇÃO DE PLANILHAS: quando o usuário pedir uma planilha financeira, planilha de " +
  "custos, orçamento ou cotação em formato de planilha, responda normalmente e, ao final, " +
  "inclua um único bloco de código com a linguagem `alpha1-sheet` contendo APENAS um JSON " +
  "válido neste formato:\n" +
  "```alpha1-sheet\n" +
  "{\n" +
  '  "title": "Custos do Projeto X",\n' +
  '  "sheets": [{\n' +
  '    "name": "Custos",\n' +
  '    "columns": ["Item", "Categoria", "Qtd", "Valor Unit", "Total"],\n' +
  '    "rows": [["Notebook", "Equipamento", 2, 3500, 7000]],\n' +
  '    "currencyColumns": [3, 4],\n' +
  '    "totals": true\n' +
  "  }]\n" +
  "}\n" +
  "```\n" +
  "Regras do bloco: valores monetários como NÚMEROS (sem 'R$' nem separador de milhar), " +
  "`currencyColumns` são os índices 0-based das colunas de dinheiro, e o JSON deve ser " +
  "válido (sem comentários). Gere o bloco somente quando uma planilha for de fato útil.\n\n" +
  "GERAÇÃO DE DOCUMENTOS WORD: quando o usuário pedir um documento, proposta, relatório, " +
  "carta, contrato ou texto formatado em Word, responda normalmente e, ao final, inclua um " +
  "único bloco de código com a linguagem `alpha1-doc` contendo APENAS um JSON válido assim:\n" +
  "```alpha1-doc\n" +
  "{\n" +
  '  "title": "Proposta Comercial",\n' +
  '  "blocks": [\n' +
  '    { "type": "heading", "level": 1, "text": "Introdução" },\n' +
  '    { "type": "paragraph", "text": "Texto do parágrafo." },\n' +
  '    { "type": "bullets", "items": ["Item A", "Item B"] },\n' +
  '    { "type": "numbered", "items": ["Passo 1", "Passo 2"] },\n' +
  '    { "type": "table", "columns": ["Item", "Valor"], "rows": [["Plano X", "R$ 100"]] }\n' +
  "  ]\n" +
  "}\n" +
  "```\n" +
  "Tipos de bloco: heading (level 1-4), paragraph, bullets, numbered, table. O JSON deve ser " +
  "válido. Gere o bloco somente quando um documento Word for de fato útil; caso contrário, " +
  "responda normalmente em markdown.";

// Janela de contexto enviada ao modelo.
// Manter curto = prefill mais rápido = primeiro token mais rápido.
const MAX_HISTORY_MSGS = 20;   // últimas 20 mensagens (10 trocas)
const MAX_MSG_LENGTH = 32_000; // chars por mensagem

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: Request) {
  const username = await readSessionEdge(req.headers.get("cookie"));
  if (!username) {
    return new Response(JSON.stringify({ error: "Sessão expirada. Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting: 30 msgs / min por usuário
  const rl = await rateLimit(`chat:${username}`, LIMITS.chat.limit, LIMITS.chat.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  const apiKey = process.env.OPENAI_API_KEY || "mangaba";

  let messages: ChatMessage[];
  let requestedModel: string | undefined;
  let searchResults: SearchResult[] = [];
  let searchQuery = "";
  try {
    const body = await req.json();
    messages = body.messages;
    requestedModel = typeof body.model === "string" ? body.model : undefined;
    // Resultados de busca pré-computados pelo frontend via /api/search
    if (Array.isArray(body.searchResults)) searchResults = body.searchResults;
    if (typeof body.searchQuery === "string") searchQuery = body.searchQuery;
    if (!Array.isArray(messages)) throw new Error();

    // Validação básica
    for (const m of messages) {
      if (!["user", "assistant"].includes(m.role)) {
        return new Response(JSON.stringify({ error: "Role de mensagem inválido." }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
      if (typeof m.content !== "string" || m.content.length > MAX_MSG_LENGTH) {
        return new Response(JSON.stringify({ error: "Mensagem muito longa." }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Truncar histórico ──────────────────────────────────────────────
  const trimmed: ChatMessage[] =
    messages.length > MAX_HISTORY_MSGS
      ? [messages[0], ...messages.slice(-MAX_HISTORY_MSGS + 1)]
      : messages;

  // ── Contexto de busca (pré-computado pelo /api/search) ─────────────
  const searchContext = searchResults.length
    ? formatSearchContext(searchQuery, searchResults)
    : "";

  const baseUrl = (process.env.OPENAI_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
  const model = requestedModel || process.env.OPENAI_MODEL || "mangaba-pro";

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content: searchContext
              ? `${SYSTEM_PROMPT}\n\n${searchContext}`
              : SYSTEM_PROMPT,
          },
          ...trimmed,
        ],
        // ── Opções de velocidade para o Ollama ───────────────────────────
        // num_ctx: janela de contexto. 2048 cobre a conversa normal (prefill
        //   rápido). Com fontes da web injetadas (conteúdo de páginas), o
        //   contexto fica grande, então ampliamos para não truncar as fontes.
        // num_predict: -1 = sem limite de tokens gerados (padrão).
        options: {
          num_ctx: searchContext ? 8192 : 2048,
          num_predict: -1,
        },
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Não foi possível conectar ao serviço de IA." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Erro do provedor de IA (${upstream.status}).`, detail }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Stream de tokens para o browser ──────────────────────────────────
  // Parseia SSE do Ollama e re-emite apenas o texto dos tokens,
  // sem overhead de JSON por parte do browser.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const data = trimmedLine.slice(5).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch { /* ignorar chunks parciais/keepalive */ }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // desabilita buffering em proxies
    },
  });
}
