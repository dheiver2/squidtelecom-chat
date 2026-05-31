import { describe, it, expect } from "vitest";
import { rateLimit, getIp, tooManyRequests, LIMITS } from "../app/lib/ratelimit";

describe("rateLimit (sliding window in-memory)", () => {
  it("permite requests dentro do limite", async () => {
    const key = `test-allow-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit(key, 5, 60);
      expect(r.allowed).toBe(true);
    }
  });

  it("bloqueia ao ultrapassar o limite", async () => {
    const key = `test-block-${Math.random()}`;
    let lastAllowed = true;
    for (let i = 0; i < 7; i++) {
      lastAllowed = (await rateLimit(key, 5, 60)).allowed;
    }
    expect(lastAllowed).toBe(false); // 6ª e 7ª devem bloquear
  });

  it("remaining decrementa corretamente", async () => {
    const key = `test-remaining-${Math.random()}`;
    const r1 = await rateLimit(key, 3, 60);
    expect(r1.remaining).toBe(2);
    const r2 = await rateLimit(key, 3, 60);
    expect(r2.remaining).toBe(1);
  });

  it("janela reinicia após expirar", async () => {
    const key = `test-reset-${Math.random()}`;
    // janela de 1 segundo
    await rateLimit(key, 1, 1);
    const blocked = await rateLimit(key, 1, 1);
    expect(blocked.allowed).toBe(false);
    // espera a janela expirar
    await new Promise((res) => setTimeout(res, 1100));
    const afterReset = await rateLimit(key, 1, 1);
    expect(afterReset.allowed).toBe(true);
  });

  it("chaves diferentes têm contadores independentes", async () => {
    const a = `key-a-${Math.random()}`;
    const b = `key-b-${Math.random()}`;
    await rateLimit(a, 1, 60);
    const aBlocked = await rateLimit(a, 1, 60);
    const bFresh = await rateLimit(b, 1, 60);
    expect(aBlocked.allowed).toBe(false);
    expect(bFresh.allowed).toBe(true);
  });
});

describe("getIp", () => {
  it("usa o IP mais à direita de x-forwarded-for (não confia no valor à esquerda, que é spoofável)", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getIp(req)).toBe("5.6.7.8");
  });

  it("prefere headers confiáveis da plataforma sobre x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "9.9.9.9" },
    });
    expect(getIp(req)).toBe("9.9.9.9");
  });

  it("cai para 'unknown' sem headers", () => {
    expect(getIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("tooManyRequests", () => {
  it("retorna 429 com Retry-After", () => {
    const res = tooManyRequests(Date.now() + 30_000);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("LIMITS configurados", () => {
  it("login mais restrito que chat", () => {
    expect(LIMITS.login.limit).toBeLessThan(LIMITS.chat.limit);
  });
});
