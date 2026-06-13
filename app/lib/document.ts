// ============================================================
// Tipos e validação do payload de documento Word (.docx).
// O assistente emite um bloco ```squid-doc com este JSON; o frontend
// mostra prévia + botão de download, que chama /api/document.
// ============================================================

export type DocBlock =
  | { type: "heading"; level?: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; columns: string[]; rows: Array<Array<string | number>> };

export interface DocumentSpec {
  title: string;
  blocks: DocBlock[];
}

const MAX_BLOCKS = 2000;
const MAX_ITEMS = 500;
const MAX_COLS = 30;
const MAX_ROWS = 2000;
const MAX_TEXT = 20_000;

const t = (v: unknown, max = MAX_TEXT) => String(v ?? "").slice(0, max);

/** Valida e normaliza o payload vindo do cliente. Lança Error se inválido. */
export function validateDocumentSpec(input: unknown): DocumentSpec {
  if (!input || typeof input !== "object") throw new Error("Payload inválido.");
  const obj = input as Record<string, unknown>;
  const title = (typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "Documento").slice(0, 200);

  if (!Array.isArray(obj.blocks) || !obj.blocks.length) {
    throw new Error("É preciso ao menos um bloco (blocks).");
  }
  if (obj.blocks.length > MAX_BLOCKS) throw new Error("Excesso de blocos.");

  const blocks: DocBlock[] = [];
  for (const raw of obj.blocks) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    const type = String(b.type || "");
    switch (type) {
      case "heading": {
        const level = Number(b.level);
        blocks.push({ type: "heading", level: Number.isInteger(level) && level >= 1 && level <= 4 ? level : 1, text: t(b.text, 500) });
        break;
      }
      case "paragraph":
        blocks.push({ type: "paragraph", text: t(b.text) });
        break;
      case "bullets":
      case "numbered": {
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, MAX_ITEMS).map((i) => t(i, 2000));
        if (items.length) blocks.push({ type: type as "bullets" | "numbered", items });
        break;
      }
      case "table": {
        const columns = (Array.isArray(b.columns) ? b.columns : []).slice(0, MAX_COLS).map((c) => t(c, 300));
        const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, MAX_ROWS).map((r) =>
          (Array.isArray(r) ? r : []).slice(0, MAX_COLS).map((v) =>
            typeof v === "number" && Number.isFinite(v) ? v : t(v, 1000)
          )
        );
        if (columns.length) blocks.push({ type: "table", columns, rows });
        break;
      }
      default:
        // ignora tipos desconhecidos
        break;
    }
  }

  if (!blocks.length) throw new Error("Nenhum bloco válido.");
  return { title, blocks };
}
