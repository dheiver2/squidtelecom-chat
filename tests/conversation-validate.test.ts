import { describe, it, expect } from "vitest";
import {
  validateConversationInput,
  MAX_MESSAGES,
  MAX_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
} from "../app/lib/conversation-validate";

describe("validateConversationInput — título", () => {
  it("usa 'Nova conversa' quando o título é vazio ou não-string", () => {
    expect(validateConversationInput("", [], null).title).toBe("Nova conversa");
    expect(validateConversationInput("   ", [], null).title).toBe("Nova conversa");
    expect(validateConversationInput(123, [], null).title).toBe("Nova conversa");
  });

  it("apara espaços e corta no tamanho máximo", () => {
    const longo = "a".repeat(MAX_TITLE_LENGTH + 50);
    const out = validateConversationInput(`  ${longo}  `, [], null);
    expect(out.title.length).toBe(MAX_TITLE_LENGTH);
  });
});

describe("validateConversationInput — mensagens", () => {
  it("trata null como lista vazia", () => {
    expect(validateConversationInput("t", null, null).messages).toEqual([]);
  });

  it("lança erro quando messages não é lista (e não é null)", () => {
    expect(() => validateConversationInput("t", "nao-lista", null)).toThrow();
    expect(() => validateConversationInput("t", 42, null)).toThrow();
  });

  it("preserva mensagens válidas {role, content}", () => {
    const msgs = [
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
    ];
    expect(validateConversationInput("t", msgs, null).messages).toEqual(msgs);
  });

  it("lança erro em mensagem com content não-string", () => {
    expect(() =>
      validateConversationInput("t", [{ role: "user", content: 123 }], null)
    ).toThrow("Mensagem inválida.");
  });

  it("lança erro quando o conteúdo excede o limite", () => {
    const grande = "x".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(() =>
      validateConversationInput("t", [{ role: "user", content: grande }], null)
    ).toThrow("Mensagem muito longa.");
  });

  it("lança erro quando excede o número máximo de mensagens", () => {
    const muitas = Array.from({ length: MAX_MESSAGES + 1 }, () => ({
      role: "user",
      content: "x",
    }));
    expect(() => validateConversationInput("t", muitas, null)).toThrow();
  });
});

describe("validateConversationInput — fontes e modelo", () => {
  it("preserva fontes válidas e descarta as sem url", () => {
    const msgs = [
      {
        role: "assistant",
        content: "resposta",
        sources: [
          { title: "A", url: "https://a.com" },
          { title: "sem url", url: "" },
        ],
      },
    ];
    const out = validateConversationInput("t", msgs, null);
    expect(out.messages[0].sources).toEqual([{ title: "A", url: "https://a.com" }]);
  });

  it("limita as fontes a 20", () => {
    const sources = Array.from({ length: 30 }, (_, i) => ({
      title: `T${i}`,
      url: `https://x${i}.com`,
    }));
    const out = validateConversationInput(
      "t",
      [{ role: "assistant", content: "c", sources }],
      null
    );
    expect(out.messages[0].sources!.length).toBe(20);
  });

  it("não inclui campo sources quando não há fontes válidas", () => {
    const out = validateConversationInput("t", [{ role: "user", content: "oi" }], null);
    expect("sources" in out.messages[0]).toBe(false);
  });

  it("normaliza o modelo: string cortada, não-string vira null", () => {
    expect(validateConversationInput("t", [], "modelo-x").model).toBe("modelo-x");
    expect(validateConversationInput("t", [], null).model).toBeNull();
    expect(validateConversationInput("t", [], 99).model).toBeNull();
  });
});
