// ============================================================
// Provisionamento das contas dos funcionários EM PRODUÇÃO (sem script local).
// Protegido por token (env ADMIN_SEED_TOKEN). Cria as contas da allowlist que
// ainda não existem e PRESERVA as existentes.
//
// Uso (uma vez, após o deploy):
//   1) Defina ADMIN_SEED_TOKEN nas env vars da Vercel (um segredo forte).
//      Opcional: SEED_DEFAULT_PASSWORD (senha padrão para todos). Se ausente,
//      gera uma senha aleatória por usuário e a retorna na resposta.
//   2) Abra/chame: /api/admin/seed?token=SEU_TOKEN
//   3) (recomendado) Remova ADMIN_SEED_TOKEN depois, para desativar a rota.
// ============================================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { migrateDb, userExists, createUser } from "../../../lib/db";
import { hashPasswordBcrypt } from "../../../lib/auth";
import { allowedEmails, normalizeEmail } from "../../../lib/allowlist";

function genPassword() {
  return crypto.randomBytes(8).toString("base64url");
}

// Senha determinística a partir de um segredo + e-mail. Permite gerar a lista
// de credenciais ANTES do seed e o banco reproduzir exatamente as mesmas senhas.
function derivePassword(secret: string, email: string) {
  return crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url").slice(0, 12);
}

async function handle(req: Request) {
  const token = process.env.ADMIN_SEED_TOKEN;
  const provided =
    new URL(req.url).searchParams.get("token") || req.headers.get("x-seed-token") || "";
  if (!token || provided !== token) {
    return Response.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    await migrateDb();
    const seedSecret = process.env.SEED_SECRET || "";
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "";
    const created: Array<{ email: string; password?: string }> = [];
    let skipped = 0;

    for (const raw of allowedEmails()) {
      const email = normalizeEmail(raw);
      if (await userExists(email)) { skipped++; continue; }
      // Prioridade: SEED_SECRET (determinístico) > SEED_DEFAULT_PASSWORD > aleatório.
      const password = seedSecret
        ? derivePassword(seedSecret, email)
        : (defaultPassword || genPassword());
      await createUser(email, await hashPasswordBcrypt(password));
      // Com SEED_SECRET ou senha padrão, o admin já tem as senhas → não devolve.
      created.push(seedSecret || defaultPassword ? { email } : { email, password });
    }

    return Response.json({
      ok: true,
      createdCount: created.length,
      skippedCount: skipped,
      passwordMode: seedSecret ? "deterministic" : defaultPassword ? "default" : "random",
      accounts: created,
    });
  } catch (e) {
    console.error("seed error", e);
    return Response.json({ error: "Erro ao provisionar." }, { status: 500 });
  }
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }
