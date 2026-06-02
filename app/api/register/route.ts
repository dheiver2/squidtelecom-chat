export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { hashPasswordBcrypt } from "../../lib/auth";
import { createUser, userExists } from "../../lib/db";
import { rateLimit, LIMITS, getIp, tooManyRequests } from "../../lib/ratelimit";
import { isAllowedEmail, EMAIL_RE, normalizeEmail } from "../../lib/allowlist";

export async function POST(req: Request) {
  // Rate limiting: 3 cadastros / hora por IP
  const ip = getIp(req);
  const rl = await rateLimit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  let email: string, password: string;
  try {
    const body = await req.json();
    // Login por e-mail. Aceita tanto `email` quanto `username` (compat).
    email = normalizeEmail(body.email ?? body.username ?? "");
    password = String(body.password || "");
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 422 });
  }
  // Trava: só e-mails na lista de funcionários autorizados podem se cadastrar.
  if (!isAllowedEmail(email)) {
    return Response.json(
      { error: "Este e-mail não está autorizado. Fale com o administrador da Alpha 1." },
      { status: 403 }
    );
  }
  if (password.length < 6) {
    return Response.json({ error: "Senha deve ter no mínimo 6 caracteres." }, { status: 422 });
  }

  try {
    if (await userExists(email)) {
      return Response.json({ error: "Este e-mail já tem conta. Faça login." }, { status: 409 });
    }
    const hash = await hashPasswordBcrypt(password);
    await createUser(email, hash);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("register error", e);
    return Response.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
