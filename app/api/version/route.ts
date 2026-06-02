// Informa o build atual do servidor. O cliente compara com o seu APP_BUILD
// (embutido no bundle que ele carregou); se diferirem, há uma versão nova.
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { APP_BUILD } from "../../lib/build";

export async function GET() {
  return new Response(JSON.stringify({ build: APP_BUILD }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
