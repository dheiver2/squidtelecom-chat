// Identificador do build atual (injetado em build time pelo next.config.js).
// Usado pelo cliente para detectar quando há uma versão nova publicada.
export const APP_BUILD = process.env.NEXT_PUBLIC_BUILD || "dev";
