// ============================================================
// Camada de abstração "Mangaba AI"
// ------------------------------------------------------------
// Todo o app fala apenas em "Mangaba AI" e modelos "Mangaba".
// O motor real é servido por um endpoint compatível com OpenAI
// (hoje: Hugging Face), configurado via OPENAI_BASE_URL/OPENAI_MODEL.
// ============================================================

/** Nome de marca do motor de IA exibido ao usuário. */
export const ENGINE_NAME = "Mangaba AI";

/** Modelo "oficial" da plataforma servido pelo Mangaba. */
export const PRIMARY_MODEL_ID = "mangaba-pro";

/** Modelos aceitos como fallback, em ordem de preferência. */
const FALLBACK_MODEL_IDS = ["mangaba-pro", "mangaba-mini", "mangaba-1", "llama3.2", "llama3.1"];

/** Mapa: id do modelo (motor real) -> nome de marca Mangaba. */
const MODEL_BRAND: Record<string, string> = {
  "mangaba-pro": "Mangaba Pro",
  "mangaba-mini": "Mangaba Mini",
  "mangaba-1": "Mangaba 1",
  "llama3.2": "Mangaba Pro",
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

/** Link de instalação do motor que executa o Mangaba AI. */
export const ENGINE_DOWNLOAD_URL = "https://mangaba-site.vercel.app";

/** Comandos de configuração do motor Mangaba AI. */
export function setupCommands(origin: string) {
  return {
    // Instala o framework Mangaba e baixa o modelo oficial.
    install: "pip install mangaba",
    pull: `mangaba pull ${PRIMARY_MODEL_ID}`,
    // Inicia o motor liberando o acesso da plataforma (navegador).
    serve: `MANGABA_ORIGINS=${origin} mangaba serve`,
    serveWindows: `$env:MANGABA_ORIGINS="${origin}"; mangaba serve`,
  };
}
