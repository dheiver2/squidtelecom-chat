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

async function handle(req: Request) {
  const token = process.env.ADMIN_SEED_TOKEN;
  const provided =
    new URL(req.url).searchParams.get("token") || req.headers.get("x-seed-token") || "";
  if (!token || provided !== token) {
    return Response.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    await migrateDb();
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "";
    const created: Array<{ email: string; password?: string }> = [];
    let skipped = 0;

    for (const raw of allowedEmails()) {
      const email = normalizeEmail(raw);
      if (await userExists(email)) { skipped++; continue; }
      const password = defaultPassword || genPassword();
      await createUser(email, await hashPasswordBcrypt(password));
      // Se há senha padrão (o admin já a conhece), não devolvemos a senha.
      created.push(defaultPassword ? { email } : { email, password });
    }

    return Response.json({
      ok: true,
      createdCount: created.length,
      skippedCount: skipped,
      usingDefaultPassword: Boolean(defaultPassword),
      accounts: created,
    });
  } catch (e) {
    console.error("seed error", e);
    return Response.json({ error: "Erro ao provisionar." }, { status: 500 });
  }
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }
