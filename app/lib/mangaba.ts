// ============================================================
// Camada de abstração "Mangaba AI"
// ------------------------------------------------------------
// Todo o app fala apenas em "Mangaba AI" e modelos "Mangaba".
// Esta é a ÚNICA camada que conhece o motor real (Ollama) e os
// modelos base. Para trocar de backend no futuro, altere só aqui.
// ============================================================

/** Nome de marca do motor de IA exibido ao usuário. */
export const ENGINE_NAME = "Mangaba AI";

/** Endpoint do motor local (detalhe de implementação — não exibir). */
export const ENGINE_BASE_URL = "http://localhost:11434";

/** Modelo "oficial" da plataforma (criado localmente via abstração). */
export const PRIMARY_MODEL_ID = "mangaba-1";

/** Modelos base aceitos como fallback, em ordem de preferência. */
const FALLBACK_MODEL_IDS = ["llama3.2", "llama3.1", "llama3"];

/** Mapa: id do modelo base (motor real) -> nome de marca Mangaba. */
const MODEL_BRAND: Record<string, string> = {
  "mangaba-1": "Mangaba 1",
  "llama3.2": "Mangaba 1",
  "llama3.1": "Mangaba 1 Pro",
  "llama3": "Mangaba 1",
  mistral: "Mangaba Mistral",
  "qwen2.5": "Mangaba Q",
  qwen2: "Mangaba Q",
  phi3: "Mangaba Lite",
  gemma2: "Mangaba G",
  gemma: "Mangaba G",
};

/** Converte o id real do modelo no nome de marca Mangaba. */
export function brandModel(realModelId: string): string {
  const base = realModelId.replace(/:latest$/, "").toLowerCase();
  return MODEL_BRAND[base] || `Mangaba (${base})`;
}

/**
 * Escolhe o melhor modelo disponível no motor, priorizando o modelo
 * oficial da plataforma e depois os modelos base conhecidos.
 */
export function pickModel(available: string[]): string {
  const norm = available.map((n) => n.replace(/:latest$/, ""));
  const byPrefix = (p: string) => norm.find((n) => n.toLowerCase().startsWith(p));
  return (
    byPrefix("mangaba") ||
    FALLBACK_MODEL_IDS.map(byPrefix).find(Boolean) ||
    norm[0] ||
    PRIMARY_MODEL_ID
  );
}

// ------------------------------------------------------------
// Configuração / instalação (centralizada para a landing page)
// ------------------------------------------------------------

/** Link de download do motor que executa o Mangaba AI. */
export const ENGINE_DOWNLOAD_URL = "https://ollama.com/download";

/** Comandos de configuração do motor Mangaba AI. */
export function setupCommands(origin: string) {
  return {
    // Baixa o modelo base e o registra como "Mangaba 1" localmente.
    pull: "ollama pull llama3.2",
    brand: "ollama cp llama3.2 mangaba-1",
    // Inicia o motor liberando o acesso da plataforma (navegador).
    serve: `OLLAMA_ORIGINS=${origin} ollama serve`,
    serveWindows: `$env:OLLAMA_ORIGINS="${origin}"; ollama serve`,
  };
}
