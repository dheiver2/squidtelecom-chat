// ============================================================
// Tipos e validação do payload de planilha financeira.
// O assistente emite um bloco ```squid-sheet com este JSON;
// o frontend mostra prévia + botão de download, que chama
// /api/spreadsheet para gerar o .xlsx real (exceljs).
// ============================================================

export interface SheetSpec {
  /** Nome da aba. */
  name: string;
  /** Cabeçalhos das colunas. */
  columns: string[];
  /** Linhas (cada uma com o mesmo nº de colunas). Valores numéricos ou texto. */
  rows: Array<Array<string | number>>;
  /** Índices (0-based) das colunas numéricas a formatar como moeda (R$). */
  currencyColumns?: number[];
  /** Se true, adiciona linha de TOTAL somando as colunas de moeda. */
  totals?: boolean;
}

export interface SpreadsheetSpec {
  /** Título/arquivo. */
  title: string;
  sheets: SheetSpec[];
}

const MAX_SHEETS = 12;
const MAX_COLS = 60;
const MAX_ROWS = 5000;

/** Valida e normaliza o payload vindo do cliente. Lança Error se inválido. */
export function validateSpreadsheetSpec(input: unknown): SpreadsheetSpec {
  if (!input || typeof input !== "object") throw new Error("Payload inválido.");
  const obj = input as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : "Planilha";

  if (!Array.isArray(obj.sheets) || obj.sheets.length === 0) {
    throw new Error("É preciso ao menos uma aba (sheets).");
  }
  if (obj.sheets.length > MAX_SHEETS) throw new Error("Excesso de abas.");

  const sheets: SheetSpec[] = obj.sheets.map((raw, i) => {
    const s = raw as Record<string, unknown>;
    const columns = Array.isArray(s.columns) ? s.columns.map((c) => String(c)) : [];
    if (!columns.length) throw new Error(`Aba ${i + 1}: sem colunas.`);
    if (columns.length > MAX_COLS) throw new Error(`Aba ${i + 1}: colunas demais.`);

    const rawRows = Array.isArray(s.rows) ? s.rows : [];
    if (rawRows.length > MAX_ROWS) throw new Error(`Aba ${i + 1}: linhas demais.`);
    const rows = rawRows.map((r) =>
      (Array.isArray(r) ? r : []).slice(0, columns.length).map((v) =>
        typeof v === "number" && Number.isFinite(v) ? v : String(v ?? "")
      )
    );

    const currencyColumns = Array.isArray(s.currencyColumns)
      ? s.currencyColumns
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 0 && n < columns.length)
      : [];

    return {
      name: (typeof s.name === "string" && s.name.trim() ? s.name.trim() : `Aba ${i + 1}`).slice(0, 31),
      columns,
      rows,
      currencyColumns,
      totals: Boolean(s.totals),
    };
  });

  return { title, sheets };
}
