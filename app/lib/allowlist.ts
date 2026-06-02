// ============================================================
// Lista de e-mails autorizados (funcionários da Alpha 1).
// Só estes e-mails podem criar conta (auto-cadastro restrito).
// O login é por e-mail. Para liberar alguém, adicione aqui.
// ============================================================

// E-mail → nome de exibição.
const TEAM: Record<string, string> = {
  "anna01.angelo@gmail.com": "Ana Maria Alves da Silva Angelo",
  "paulafalcao@alpha1consultoria.com": "Ana Paula Falcão Freire",
  "bkocomercial@alpha1consultoria.com": "Beatriz Iara da Silva Lopes",
  "alpha1auxvendas@gmail.com": "Camila Cristina Gonçalves Maia Miranda",
  "noc@alpha1consultoria.com": "Ivilly Ily Maria dos Santos Balbino",
  "jadson.ferreira@alpha1consultoria.com": "Jadson José Ferreira",
  "jairoribeiro@alpha1consultoria.com": "Jairo Ribeiro Maciel Neto",
  "faturamento@alpha1consultoria.com": "Joanneglayce de Almeida Lima",
  "financeiro@alpha1consultoria.com": "Joanneglayse de Almeida Lima Sá",
  "analisededadosalpha1@gmail.com": "José Charles de Souza Moura",
  "messias.mma2014@gmail.com": "Madson Messias Alves",
  "contasapagar@alpha1consultoria.com": "Matheus Pereira da Silva Barros",
  "maycon.tavares@alpha1consultoria.com": "Maycon Douglas Ferreira Tavares",
  "gestao@alpha1consultoria.com": "Pollyana Nogueira de Souza B. de Aquino",
  "operacional@alpha1consultoria.com": "Ricardo Fonseca Miranda",
  "adm@alpha1consultoria.com": "Roberta Priscila da Silva Moreira",
  "vitor.ar.vr@gmail.com": "Vitor de Almeida Rodrigues dos Santos",
  "vitormoliveira90@gmail.com": "Vitor Manoel de Oliveira Caetano",
  "williamsandrevieiradasilva@gmail.com": "Williams Andre Vieira da Silva",
};

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
