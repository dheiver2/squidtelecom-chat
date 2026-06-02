// ============================================================
// Validação/saneamento do payload de conversas sincronizadas.
// Impede abuso de armazenamento (JSONB sem limite) e payloads malformados.
// ============================================================

export const MAX_TITLE_LENGTH = 200;
export const MAX_MESSAGES = 1000;
export const MAX_MESSAGE_LENGTH = 32_000; // mesmo cap do /api/chat
export const MAX_MODEL_LENGTH = 120;

export interface CleanConversation {
  title: string;
  messages: Array<{ role: string; content: string; sources?: Array<{ title: string; url: string }> }>;
  model: string | null;
}

/** Normaliza e valida os campos. Lança Error com mensagem amigável se inválido. */
export function validateConversationInput(
  title: unknown,
  messages: unknown,
  model: unknown
): CleanConversation {
  const cleanTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, MAX_TITLE_LENGTH)
      : "Nova conversa";

  if (messages != null && !Array.isArray(messages)) {
    throw new Error("messages deve ser uma lista.");
  }
  const arr = Array.isArray(messages) ? messages : [];
  if (arr.length > MAX_MESSAGES) {
    throw new Error(`Conversa excede o limite de ${MAX_MESSAGES} mensagens.`);
  }
  const cleanMessages = arr.map((m) => {
    if (!m || typeof m !== "object") throw new Error("Mensagem inválida.");
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (typeof role !== "string" || typeof content !== "string") {
      throw new Error("Mensagem inválida.");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error("Mensagem muito longa.");
    }
    // Preserva as fontes da web (citações), se válidas.
    const rawSources = (m as { sources?: unknown }).sources;
    const sources = Array.isArray(rawSources)
      ? rawSources
          .slice(0, 20)
          .map((s) => ({
            title: String((s as { title?: unknown })?.title ?? "").slice(0, 300),
            url: String((s as { url?: unknown })?.url ?? "").slice(0, 2000),
          }))
          .filter((s) => s.url)
      : undefined;
    return sources && sources.length ? { role, content, sources } : { role, content };
  });

  const cleanModel =
    typeof model === "string" ? model.slice(0, MAX_MODEL_LENGTH) : null;

  return { title: cleanTitle, messages: cleanMessages, model: cleanModel };
}
