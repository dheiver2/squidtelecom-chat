import { describe, it, expect } from "vitest";

// Mesmo segredo nos dois módulos — é o que garante a interoperabilidade
// entre o token criado no Node (auth.ts) e a leitura no Edge (auth-edge.ts).
// Definido ANTES dos imports dinâmicos (os módulos leem o segredo no topo).
process.env.SESSION_SECRET = "segredo-de-teste-1234567890";

const { createSessionToken } = await import("../app/lib/auth");
const { readSessionEdge } = await import("../app/lib/auth-edge");

describe("auth-edge (Web Crypto) interopera com auth (Node crypto)", () => {
  it("lê no Edge um token criado no Node", async () => {
    const token = createSessionToken("maria");
    const cookie = `a1_session=${encodeURIComponent(token)}`;
    expect(await readSessionEdge(cookie)).toBe("maria");
  });

  it("retorna null para cookie ausente", async () => {
    expect(await readSessionEdge(null)).toBeNull();
    expect(await readSessionEdge("foo=bar")).toBeNull();
  });

  it("rejeita assinatura adulterada", async () => {
    const token = createSessionToken("maria");
    const tampered = token.slice(0, -2) + "zz";
    const cookie = `a1_session=${encodeURIComponent(tampered)}`;
    expect(await readSessionEdge(cookie)).toBeNull();
  });

  it("rejeita token expirado", async () => {
    // Constrói manualmente um token expirado com a mesma assinatura HMAC
    const crypto = await import("crypto");
    const secret = process.env.SESSION_SECRET!;
    const payload = Buffer.from(
      JSON.stringify({ u: "maria", exp: Date.now() - 1000 })
    ).toString("base64url");
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    const cookie = `a1_session=${encodeURIComponent(`${payload}.${sig}`)}`;
    expect(await readSessionEdge(cookie)).toBeNull();
  });
});
