export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auto-cadastro DESABILITADO. As contas são provisionadas pelo administrador
// (apenas funcionários da lista). Mantido como 403 por segurança, caso alguém
// chame a rota diretamente.
export async function POST() {
  return Response.json(
    { error: "Cadastro indisponível. As contas são criadas pelo administrador da Squid Telecom." },
    { status: 403 }
  );
}
