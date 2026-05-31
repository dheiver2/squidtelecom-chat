import { describe, it, expect } from "vitest";

// Define o segredo ANTES do import dinâmico (auth.ts lê SESSION_SECRET no topo).
process.env.SESSION_SECRET = "segredo-de-teste-1234567890";

const {
  hashPasswordBcrypt,
  verifyPassword,
  hashPassword,
  createSessionToken,
  readSession,
  sessionCookie,
  clearSessionCookie,
} = await import("../app/lib/auth");

describe("hashPasswordBcrypt + verifyPassword", () => {
  it("aceita a senha correta (bcrypt)", async () => {
    const hash = await hashPasswordBcrypt("minhaSenha123");
    const { valid, needsRehash } = await verifyPassword("user", "minhaSenha123", hash);
    expect(valid).toBe(true);
    expect(needsRehash).toBe(false);
  });

  it("rejeita senha errada", async () => {
    const hash = await hashPasswordBcrypt("minhaSenha123");
    const { valid } = await verifyPassword("user", "senhaErrada", hash);
    expect(valid).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const a = await hashPasswordBcrypt("igual");
    const b = await hashPasswordBcrypt("igual");
    expect(a).not.toBe(b);
    expect(a.startsWith("$2")).toBe(true);
  });
});

describe("migração transparente HMAC → bcrypt", () => {
  it("valida hash legado HMAC e sinaliza needsRehash", async () => {
    const legacy = hashPassword("joao", "senha-antiga");
    const { valid, needsRehash } = await verifyPassword("joao", "senha-antiga", legacy);
    expect(valid).toBe(true);
    expect(needsRehash).toBe(true); // deve migrar para bcrypt
  });

  it("rejeita senha errada contra hash legado", async () => {
    const legacy = hashPassword("joao", "senha-antiga");
    const { valid } = await verifyPassword("joao", "errada", legacy);
    expect(valid).toBe(false);
  });
});

describe("sessão (createSessionToken / readSession)", () => {
  it("roundtrip: token criado é lido de volta", () => {
    const token = createSessionToken("dheiver");
    const cookie = `a1_session=${encodeURIComponent(token)}`;
    expect(readSession(cookie)).toBe("dheiver");
  });

  it("retorna null para cookie ausente", () => {
    expect(readSession(null)).toBeNull();
    expect(readSession("")).toBeNull();
    expect(readSession("outro=valor")).toBeNull();
  });

  it("rejeita token adulterado (assinatura inválida)", () => {
    const token = createSessionToken("dheiver");
    const tampered = token.slice(0, -3) + "xxx";
    const cookie = `a1_session=${encodeURIComponent(tampered)}`;
    expect(readSession(cookie)).toBeNull();
  });

  it("rejeita payload modificado", () => {
    const token = createSessionToken("dheiver");
    const [, sig] = token.split(".");
    const fakePayload = Buffer.from(JSON.stringify({ u: "admin", exp: Date.now() + 99999 })).toString("base64url");
    const cookie = `a1_session=${encodeURIComponent(`${fakePayload}.${sig}`)}`;
    expect(readSession(cookie)).toBeNull();
  });
});

describe("cookies", () => {
  it("sessionCookie tem flags de segurança", () => {
    const c = sessionCookie("abc");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
  });

  it("clearSessionCookie expira o cookie", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});
