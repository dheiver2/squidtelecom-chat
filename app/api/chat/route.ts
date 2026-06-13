// Edge Runtime: sem cold start (~200-500ms poupados por request),
// executa na rede da Vercel mais próxima do usuário.
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { readSessionEdge } from "../../lib/auth-edge";
import { rateLimit, LIMITS, tooManyRequests } from "../../lib/ratelimit";
import { formatSearchContext } from "../../lib/search";
import type { SearchResult } from "../../lib/search";

// Base do system prompt — enviado SEMPRE (curto, para economizar tokens).
const BASE_PROMPT =
  "Você é a Luna, a assistente virtual inteligente da Squid Telecom (Squid Net Telecomunicações Ltda) — " +
  "provedora de internet via fibra óptica fundada em 2011, com sede em Rio Largo, Alagoas, autorizada pela Anatel. " +
  "A empresa oferece internet em fibra (residencial e empresarial), links dedicados, IP dedicado, VPN MPLS e hotspot/Wi-Fi. " +
  "Contato: telefone (82) 3352-5248, site squidtelecom.com.br. " +
  "Responda sempre em português do Brasil, de forma clara, profissional e prestativa. " +
  "Use markdown quando ajudar na leitura.\n\n" +
  "MÉTODO DE TRABALHO — ESPECIFICAÇÃO PRIMEIRO: antes de produzir qualquer entrega " +
  "(resposta, documento, planilha, plano, análise ou solução), defina primeiro a " +
  "ESPECIFICAÇÃO do que será feito: o objetivo, para quem/uso, os requisitos, o escopo e " +
  "o formato esperado. Se o pedido estiver ambíguo ou faltar uma informação essencial, faça " +
  "de 1 a 3 perguntas objetivas para fechar a especificação ANTES de entregar. Se o pedido já " +
  "estiver claro, declare em 1–2 linhas a especificação que você assumiu e então produza a " +
  "resposta baseada estritamente nela. Não invente requisitos: a entrega deve refletir " +
  "exatamente o que foi especificado.";

// Bloco de planilha — só injetado quando o pedido é sobre planilha (economiza tokens).
const SHEET_BLOCK =
  "\n\nGERAÇÃO DE PLANILHAS: quando o usuário pedir uma planilha financeira, planilha de " +
  "custos, orçamento ou cotação em formato de planilha, responda normalmente e, ao final, " +
  "inclua um único bloco de código com a linguagem `squid-sheet` contendo APENAS um JSON " +
  "válido neste formato:\n" +
  "```squid-sheet\n" +
  '{ "title": "Custos do Projeto X", "sheets": [{ "name": "Custos", ' +
  '"columns": ["Item", "Categoria", "Qtd", "Valor Unit", "Total"], ' +
  '"rows": [["Notebook", "Equipamento", 2, 3500, 7000]], "currencyColumns": [3, 4], "totals": true }] }\n' +
  "```\n" +
  "Regras: valores monetários como NÚMEROS (sem 'R$' nem separador), `currencyColumns` são os " +
  "índices 0-based das colunas de dinheiro, JSON válido. Gere o bloco só quando uma planilha for útil.";

// Bloco de documento Word — só injetado quando o pedido é sobre documento.
const DOC_BLOCK =
  "\n\nGERAÇÃO DE DOCUMENTOS WORD: quando o usuário pedir um documento, proposta, relatório, " +
  "carta, contrato ou texto formatado em Word, responda normalmente e, ao final, inclua um " +
  "único bloco de código com a linguagem `squid-doc` contendo APENAS um JSON válido assim:\n" +
  "```squid-doc\n" +
  '{ "title": "Proposta Comercial", "blocks": [ ' +
  '{ "type": "heading", "level": 1, "text": "Introdução" }, ' +
  '{ "type": "paragraph", "text": "Texto." }, ' +
  '{ "type": "bullets", "items": ["Item A", "Item B"] }, ' +
  '{ "type": "table", "columns": ["Item", "Valor"], "rows": [["Plano X", "R$ 100"]] } ] }\n' +
  "```\n" +
  "Tipos de bloco: heading (level 1-4), paragraph, bullets, numbered, table. JSON válido. " +
  "Gere o bloco só quando um documento Word for útil; caso contrário, responda em markdown.";

const SHEET_RE = /\b(planilha|or[çc]amento|cota[çc][ãa]o|custos?|\.xlsx|excel|tabela financeira)\b/i;
const DOC_RE = /\b(documento|proposta|relat[óo]rio|contrato|carta|comunicado|of[íi]cio|\.docx|word)\b/i;

// Agentes especializados: cada um adiciona um FOCO ao system prompt.
// O id vem do cliente (body.agent); valores desconhecidos caem no geral.
const AGENT_PROMPTS: Record<string, string> = {
  suporte:
    "\n\nFOCO DESTE ATENDIMENTO — SUPORTE TÉCNICO: ajude a diagnosticar problemas de internet " +
    "(lentidão, quedas, sem conexão, Wi-Fi, configuração de roteador e equipamentos de fibra) com " +
    "passos claros, numerados e objetivos. Quando faltar informação (plano, equipamento, sintoma, " +
    "luzes do modem), pergunte antes de concluir. Não invente dados da conta do cliente.",
  comercial:
    "\n\nFOCO DESTE ATENDIMENTO — COMERCIAL: apresente os serviços da Squid Telecom (internet em " +
    "fibra, link dedicado, IP dedicado, VPN MPLS), ajude o cliente a escolher a melhor opção e oriente " +
    "sobre contratação e disponibilidade. Seja consultivo e direto. Não invente preços nem prazos: " +
    "quando não souber, oriente a confirmar pelos canais oficiais.",
  financeiro:
    "\n\nFOCO DESTE ATENDIMENTO — FINANCEIRO: oriente sobre faturas, 2ª via, datas de vencimento, " +
    "formas de pagamento e renegociação. NUNCA invente valores, datas ou dados de contas; sempre " +
    "oriente o cliente a confirmar pelos canais oficiais da Squid Telecom.",
  documentos:
    "\n\nFOCO DESTE ATENDIMENTO — DOCUMENTOS: priorize entregar planilhas (.xlsx) e documentos Word " +
    "(.docx) bem estruturados conforme o pedido, usando os formatos de bloco indicados.",
};

/** Monta o system prompt por INTENÇÃO: só inclui os blocos pesados (planilha/doc)
 *  quando o texto recente do usuário indica que serão úteis. Corta tokens fixos.
 *  Também adiciona o FOCO do agente selecionado (se houver). */
function buildSystemPrompt(recentUserText: string, agent?: string): string {
  let p = BASE_PROMPT;
  const agentBlock = agent ? AGENT_PROMPTS[agent] : undefined;
  if (agentBlock) p += agentBlock;
  // Agente "documentos" sempre traz os dois blocos de formato.
  if (agent === "documentos" || SHEET_RE.test(recentUserText)) p += SHEET_BLOCK;
  if (agent === "documentos" || DOC_RE.test(recentUserText)) p += DOC_BLOCK;
  return p;
}

// Janela de contexto. Menor = menos tokens e prefill mais rápido.
const MAX_HISTORY_MSGS = 10;       // últimas ~5 trocas
const MAX_MSG_LENGTH = 32_000;     // chars por mensagem (validação de entrada)
const CONTEXT_CHAR_BUDGET = 24_000; // teto de chars de histórico+busca (~6k tokens)

const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 2048); // teto de saída

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/** Estimativa leve de tokens (sem lib pesada no Edge): ~4 chars por token. */
const estTokens = (s: string) => Math.ceil(s.length / 4);

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
  let searchResults: SearchResult[] = [];
  let searchQuery = "";
  let agent = "";
  let imageDataUrl = "";
  try {
    const body = await req.json();
    messages = body.messages;
    // O modelo NÃO vem do cliente: é definido pelo servidor (OPENAI_MODEL) para
    // garantir o modelo certo e evitar abuso/custo. Ignoramos body.model.
    // Resultados de busca pré-computados pelo frontend via /api/search
    if (Array.isArray(body.searchResults)) searchResults = body.searchResults;
    if (typeof body.searchQuery === "string") searchQuery = body.searchQuery;
    // Agente especializado selecionado no cliente (foco do atendimento).
    if (typeof body.agent === "string") agent = body.agent;
    // Imagem (data URI) para análise por visão, quando enviada.
    if (typeof body.image === "string" && body.image.startsWith("data:image/")) {
      imageDataUrl = body.image;
    }
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

  // ── Truncar histórico (por contagem) ───────────────────────────────
  let trimmed: ChatMessage[] =
    messages.length > MAX_HISTORY_MSGS
      ? [messages[0], ...messages.slice(-MAX_HISTORY_MSGS + 1)]
      : messages;

  // ── Contexto de busca (pré-computado pelo /api/search) ─────────────
  const searchContext = searchResults.length
    ? formatSearchContext(searchQuery, searchResults)
    : "";

  // ── System prompt por intenção (só blocos úteis) ────────────────────
  const recentUserText = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const systemPrompt = buildSystemPrompt(recentUserText, agent);

  // ── Orçamento de contexto: corta histórico antigo (preservando a 1ª msg
  //    e as mais recentes) até caber no teto de chars. A busca, quando há,
  //    consome parte do orçamento. Economiza tokens em conversas longas.
  const searchChars = searchContext.length;
  let budget = Math.max(2_000, CONTEXT_CHAR_BUDGET - searchChars);
  const histChars = (arr: ChatMessage[]) => arr.reduce((n, m) => n + m.content.length, 0);
  while (trimmed.length > 2 && histChars(trimmed) > budget) {
    trimmed.splice(1, 1); // remove a mensagem mais antiga depois da primeira
  }
  void estTokens; // estimativa disponível para logs/ajustes futuros

  // ── Failover entre MODELOS do mesmo provedor (Hugging Face) ──────────
  // Mesma base e mesma chave; se um modelo falhar (conexão, timeout ou status
  // != 2xx), tentamos o próximo modelo da lista antes de desistir. NÃO troca
  // de provedor.
  // payloadMessages aceita conteúdo string OU multimodal (texto + imagem).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payloadMessages: any[] = [
    {
      role: "system",
      content: searchContext ? `${systemPrompt}\n\n${searchContext}` : systemPrompt,
    },
    ...trimmed,
  ];

  // ── Visão: anexa a imagem à ÚLTIMA mensagem do usuário (formato OpenAI) ──
  if (imageDataUrl) {
    for (let i = payloadMessages.length - 1; i >= 0; i--) {
      if (payloadMessages[i].role === "user") {
        payloadMessages[i] = {
          role: "user",
          content: [
            { type: "text", text: payloadMessages[i].content || "Analise esta imagem." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        };
        break;
      }
    }
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");

  // Ordem dos modelos: o pedido pelo cliente (ou OPENAI_MODEL) primeiro, depois
  // os modelos de reserva em OPENAI_MODEL_FALLBACKS (lista separada por vírgula).
  const fallbackModels = (process.env.OPENAI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  // Com imagem, usa o modelo de VISÃO (os modelos de texto não enxergam).
  const visionModel = process.env.OPENAI_VISION_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct";
  const models = imageDataUrl
    ? [visionModel]
    : Array.from(
        new Set([process.env.OPENAI_MODEL || "", ...fallbackModels].filter(Boolean))
      );

  // Timeout só para a CONEXÃO/headers — não corta o streaming já iniciado.
  const CONNECT_TIMEOUT_MS = 20_000;
  async function openUpstream(modelId: string): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelId, stream: true, messages: payloadMessages, max_tokens: MAX_TOKENS }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok || !res.body) {
        await res.text().catch(() => ""); // drena corpo de erro
        return null;
      }
      return res;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  let upstream: Response | null = null;
  for (const modelId of models) {
    upstream = await openUpstream(modelId);
    if (upstream) break;
  }
  if (!upstream) {
    return new Response(
      JSON.stringify({ error: "Não foi possível conectar ao serviço de IA." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Stream de tokens para o browser ──────────────────────────────────
  // Parseia o SSE do provedor e re-emite apenas o texto dos tokens,
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
