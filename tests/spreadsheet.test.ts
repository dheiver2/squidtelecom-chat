import { describe, it, expect } from "vitest";
import { validateSpreadsheetSpec } from "../app/lib/spreadsheet";

const sheetBase = { name: "Custos", columns: ["Item", "Valor"], rows: [["A", 10]] };

describe("validateSpreadsheetSpec — estrutura", () => {
  it("lança erro para payload não-objeto", () => {
    expect(() => validateSpreadsheetSpec(null)).toThrow("Payload inválido.");
    expect(() => validateSpreadsheetSpec("x")).toThrow("Payload inválido.");
  });

  it("usa título padrão 'Planilha' quando ausente", () => {
    const out = validateSpreadsheetSpec({ sheets: [sheetBase] });
    expect(out.title).toBe("Planilha");
  });

  it("lança erro sem nenhuma aba", () => {
    expect(() => validateSpreadsheetSpec({ title: "X", sheets: [] })).toThrow(
      "ao menos uma aba"
    );
    expect(() => validateSpreadsheetSpec({ title: "X" })).toThrow("ao menos uma aba");
  });

  it("lança erro quando a aba não tem colunas", () => {
    expect(() =>
      validateSpreadsheetSpec({ sheets: [{ name: "A", columns: [], rows: [] }] })
    ).toThrow("sem colunas");
  });
});

describe("validateSpreadsheetSpec — normalização", () => {
  it("mantém número finito e converte o resto em string", () => {
    const out = validateSpreadsheetSpec({
      sheets: [{ columns: ["a", "b", "c"], rows: [[5, "txt", true]] }],
    });
    expect(out.sheets[0].rows[0]).toEqual([5, "txt", "true"]);
  });

  it("corta as células ao número de colunas", () => {
    const out = validateSpreadsheetSpec({
      sheets: [{ columns: ["a", "b"], rows: [[1, 2, 3, 4]] }],
    });
    expect(out.sheets[0].rows[0]).toEqual([1, 2]);
  });

  it("filtra currencyColumns fora do intervalo válido", () => {
    const out = validateSpreadsheetSpec({
      sheets: [{ columns: ["a", "b"], rows: [], currencyColumns: [1, 5, -1, 1.5] }],
    });
    expect(out.sheets[0].currencyColumns).toEqual([1]);
  });

  it("usa nome padrão 'Aba 1' e marca totals como booleano", () => {
    const out = validateSpreadsheetSpec({
      sheets: [{ columns: ["a"], rows: [], totals: "sim" }],
    });
    expect(out.sheets[0].name).toBe("Aba 1");
    expect(out.sheets[0].totals).toBe(true);
  });
});
