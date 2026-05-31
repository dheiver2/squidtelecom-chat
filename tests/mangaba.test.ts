import { describe, it, expect } from "vitest";
import { brandModel, pickModel, PRIMARY_MODEL_ID } from "../app/lib/mangaba";

describe("brandModel", () => {
  it("mapeia modelos conhecidos para nome de marca", () => {
    expect(brandModel("qwen2.5")).toBe("Mangaba Q");
    expect(brandModel("llama3.2")).toBe("Mangaba Pro");
    expect(brandModel("mistral")).toBe("Mangaba Mistral");
  });

  it("remove sufixo :latest", () => {
    expect(brandModel("qwen2.5:latest")).toBe("Mangaba Q");
  });

  it("usa fallback para modelo desconhecido", () => {
    expect(brandModel("modelo-x")).toBe("Mangaba (modelo-x)");
  });
});

describe("pickModel", () => {
  it("prioriza modelo mangaba quando disponível", () => {
    expect(pickModel(["llama3.1", "mangaba-pro", "mistral"])).toBe("mangaba-pro");
  });

  it("cai para modelo base conhecido", () => {
    expect(pickModel(["mistral", "llama3.2"])).toMatch(/llama3\.2|mistral/);
  });

  it("retorna o primeiro disponível se nada bate", () => {
    expect(pickModel(["modelo-x"])).toBe("modelo-x");
  });

  it("retorna o modelo padrão para lista vazia", () => {
    expect(pickModel([])).toBe(PRIMARY_MODEL_ID);
  });

  it("ignora sufixo :latest ao escolher", () => {
    expect(pickModel(["mangaba-pro:latest"])).toBe("mangaba-pro");
  });
});
