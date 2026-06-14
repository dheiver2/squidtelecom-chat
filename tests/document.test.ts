import { describe, it, expect } from "vitest";
import { validateDocumentSpec } from "../app/lib/document";

describe("validateDocumentSpec — estrutura", () => {
  it("lança erro para payload não-objeto", () => {
    expect(() => validateDocumentSpec(null)).toThrow("Payload inválido.");
  });

  it("usa título padrão 'Documento' quando ausente", () => {
    const out = validateDocumentSpec({ blocks: [{ type: "paragraph", text: "oi" }] });
    expect(out.title).toBe("Documento");
  });

  it("lança erro sem blocos", () => {
    expect(() => validateDocumentSpec({ title: "X", blocks: [] })).toThrow(
      "ao menos um bloco"
    );
  });

  it("lança erro quando nenhum bloco é válido", () => {
    expect(() =>
      validateDocumentSpec({ blocks: [{ type: "desconhecido", text: "x" }] })
    ).toThrow("Nenhum bloco válido.");
  });
});

describe("validateDocumentSpec — blocos", () => {
  it("normaliza nível de heading fora do intervalo para 1", () => {
    const out = validateDocumentSpec({
      blocks: [
        { type: "heading", level: 9, text: "A" },
        { type: "heading", level: 2, text: "B" },
      ],
    });
    expect(out.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "A" });
    expect(out.blocks[1]).toMatchObject({ type: "heading", level: 2, text: "B" });
  });

  it("mantém parágrafo e listas com itens", () => {
    const out = validateDocumentSpec({
      blocks: [
        { type: "paragraph", text: "texto" },
        { type: "bullets", items: ["a", "b"] },
        { type: "numbered", items: ["1", "2"] },
      ],
    });
    expect(out.blocks.map((b) => b.type)).toEqual(["paragraph", "bullets", "numbered"]);
  });

  it("descarta listas sem itens", () => {
    expect(() =>
      validateDocumentSpec({ blocks: [{ type: "bullets", items: [] }] })
    ).toThrow("Nenhum bloco válido.");
  });

  it("mantém tabela com colunas e preserva número nas células", () => {
    const out = validateDocumentSpec({
      blocks: [{ type: "table", columns: ["Item", "Valor"], rows: [["Plano", 100]] }],
    });
    const table = out.blocks[0];
    expect(table.type).toBe("table");
    if (table.type === "table") {
      expect(table.columns).toEqual(["Item", "Valor"]);
      expect(table.rows[0]).toEqual(["Plano", 100]);
    }
  });

  it("descarta tabela sem colunas e ignora tipos desconhecidos", () => {
    const out = validateDocumentSpec({
      blocks: [
        { type: "table", columns: [], rows: [["x"]] },
        { type: "qualquer", text: "ignora" },
        { type: "paragraph", text: "fica" },
      ],
    });
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0].type).toBe("paragraph");
  });
});
