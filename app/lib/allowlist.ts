// ============================================================
// Lista de e-mails autorizados (funcionários da Squid Telecom).
// Só estes e-mails podem criar conta (auto-cadastro restrito).
// O login é por e-mail. Para liberar alguém, adicione aqui.
// ============================================================

// E-mail → nome de exibição.
// Vazio: nenhum usuário autorizado ainda. Adicione os e-mails da Squid Telecom
// aqui (e-mail em minúsculo → nome) e rode /api/admin/seed para criar as contas.
const TEAM: Record<string, string> = {
  "adm@squidtelecom.com.br": "Administrador Squid Telecom",
};

/** Lista de todos os e-mails autorizados (para provisionamento). */
export function allowedEmails(): string[] {
  return Object.keys(TEAM);
}

/** Normaliza um e-mail para comparação (minúsculo, sem espaços). */
export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

/** True se o e-mail está autorizado a criar conta / usar a plataforma. */
export function isAllowedEmail(email: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEAM, normalizeEmail(email));
}

/** Nome de exibição do funcionário (ou o próprio e-mail, se não mapeado). */
export function displayName(email: string): string {
  return TEAM[normalizeEmail(email)] || email;
}

/** Validação simples de formato de e-mail. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
