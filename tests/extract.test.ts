import { describe, it, expect } from "vitest";
import { htmlToText, selectRelevant } from "../app/lib/extract";

describe("htmlToText", () => {
  it("remove blocos de script/style por completo", () => {
    const html = "<p>visível</p><script>roubar()</script><style>.a{}</style>";
    const out = htmlToText(html);
    expect(out).toContain("visível");
    expect(out).not.toContain("roubar");
    expect(out).not.toContain(".a{}");
  });

  it("remove as tags restantes deixando o texto", () => {
    expect(htmlToText("<div><b>Olá</b> <i>mundo</i></div>")).toContain("Olá");
    expect(htmlToText("<div><b>Olá</b> mundo</div>")).not.toContain("<b>");
  });

  it("decodifica entidades comuns e numéricas", () => {
    expect(htmlToText("a &amp; b")).toContain("a & b");
    expect(htmlToText("&#39;aspas&#39;")).toContain("'aspas'");
  });

  it("colapsa espaços em excesso", () => {
    expect(htmlToText("<p>a      b</p>")).toContain("a b");
  });
});

describe("selectRelevant", () => {
  it("devolve o conteúdo inalterado quando cabe no limite", () => {
    const c = "texto curto";
    expect(selectRelevant(c, "qualquer", 900)).toBe(c);
  });

  it("seleciona o trecho relevante à consulta e respeita o teto", () => {
    const filler =
      "Frase irrelevante sobre jardins e gatos que nada tem a ver com o tema. ";
    const relevante =
      "A fibra óptica oferece velocidade simétrica altíssima para empresas. ";
    const content = filler.repeat(20) + relevante + filler.repeat(20);
    expect(content.length).toBeGreaterThan(900);

    const out = selectRelevant(content, "fibra óptica velocidade simétrica", 900);
    expect(out.toLowerCase()).toContain("fibra");
    expect(out.length).toBeLessThanOrEqual(900);
  });

  it("sem termos úteis na consulta, devolve o início cortado no teto", () => {
    const content = "palavra ".repeat(400); // bem maior que 900
    const out = selectRelevant(content, "de a o e", 900);
    expect(out.length).toBe(900);
    expect(content.startsWith(out)).toBe(true);
  });
});
