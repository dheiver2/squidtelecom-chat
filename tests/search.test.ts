import { describe, it, expect } from "vitest";
import { formatSearchContext } from "../app/lib/search";

describe("formatSearchContext", () => {
  it("retorna string vazia sem resultados", () => {
    expect(formatSearchContext("query", [])).toBe("");
  });

  it("inclui a query e os resultados formatados", () => {
    const ctx = formatSearchContext("5G no Brasil", [
      { title: "Notícia A", url: "https://a.com", description: "desc A" },
      { title: "Notícia B", url: "https://b.com", description: "desc B" },
    ]);
    expect(ctx).toContain("5G no Brasil");
    expect(ctx).toContain("Notícia A");
    expect(ctx).toContain("https://a.com");
    expect(ctx).toContain("desc B");
  });

  it("instrui o modelo a citar as fontes", () => {
    const ctx = formatSearchContext("q", [
      { title: "T", url: "https://x.com", description: "d" },
    ]);
    expect(ctx.toLowerCase()).toContain("cite");
  });
});
