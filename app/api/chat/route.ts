export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";

const SYSTEM_PROMPT =
  "Você é o Alpha1 Assistant, o assistente virtual inteligente da Alpha 1 Consultoria — " +
  "empresa de telecomunicações, gestão e tecnologia da informação que atende empresas em todo o Brasil. " +
  "Responda sempre em português do Brasil, de forma clara, profissional e prestativa. " +
  "Use markdown quando ajudar na leitura.";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: Request) {
  // Só usuários autenticados (os 20 funcionários) podem usar a IA.
  if (!readSession(req.headers.get("cookie"))) {
    return new Response(JSON.stringify({ error: "Sessão expirada. Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // O motor (Mangaba via túnel) não exige chave. Para provedores que exigem
  // (OpenAI, Groq, etc.) defina OPENAI_API_KEY; caso contrário usamos um placeholder.
  const apiKey = process.env.OPENAI_API_KEY || "mangaba";

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error("messages inválido");
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Padrão: Mangaba local (http://localhost:11434/v1) com o modelo mangaba-pro.
  const baseUrl = (process.env.OPENAI_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "mangaba-pro";

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({
        error:
          "Não foi possível conectar ao Mangaba. Verifique se ele está rodando (`mangaba serve`) e se o modelo foi baixado (`mangaba pull mangaba-pro`). " +
          "Em deploy na Vercel, o Mangaba precisa estar exposto por um túnel público (veja o README).",
      }),
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
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // ignore partial/keepalive chunks
            }
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
    },
  });
}
