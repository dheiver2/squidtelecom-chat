import { describe, it, expect } from "vitest";
import {
  allowedEmails,
  normalizeEmail,
  isAllowedEmail,
  displayName,
  EMAIL_RE,
} from "../app/lib/allowlist";

describe("normalizeEmail", () => {
  it("apara espaços e coloca em minúsculas", () => {
    expect(normalizeEmail("  ADM@Squid.COM.BR ")).toBe("adm@squid.com.br");
  });

  it("trata entradas inválidas como string vazia", () => {
    // @ts-expect-error testando entrada inesperada
    expect(normalizeEmail(undefined)).toBe("");
    // @ts-expect-error testando entrada inesperada
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("isAllowedEmail (orientado pelos dados da allowlist)", () => {
  const first = allowedEmails()[0];

  it("a allowlist tem ao menos um e-mail", () => {
    expect(typeof first).toBe("string");
    expect(first.length).toBeGreaterThan(0);
  });

  it("autoriza um e-mail da lista, sem diferenciar maiúsculas", () => {
    expect(isAllowedEmail(first)).toBe(true);
    expect(isAllowedEmail(`  ${first.toUpperCase()}  `)).toBe(true);
  });

  it("recusa e-mail fora da lista e entradas vazias", () => {
    expect(isAllowedEmail("ninguem@exemplo.com")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });
});

describe("displayName", () => {
  it("retorna o nome para um e-mail conhecido", () => {
    const first = allowedEmails()[0];
    expect(displayName(first)).not.toBe("");
    expect(displayName(first.toUpperCase())).toBe(displayName(first));
  });

  it("retorna o próprio e-mail quando não mapeado", () => {
    expect(displayName("desconhecido@x.com")).toBe("desconhecido@x.com");
  });
});

describe("EMAIL_RE", () => {
  it("aceita e-mails válidos", () => {
    expect(EMAIL_RE.test("user@dominio.com.br")).toBe(true);
    expect(EMAIL_RE.test("a.b-c@x.io")).toBe(true);
  });

  it("rejeita e-mails inválidos", () => {
    expect(EMAIL_RE.test("sem-arroba")).toBe(false);
    expect(EMAIL_RE.test("user@semponto")).toBe(false);
    expect(EMAIL_RE.test("a b@x.com")).toBe(false);
    expect(EMAIL_RE.test("@x.com")).toBe(false);
  });
});
