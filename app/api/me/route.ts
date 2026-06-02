export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";
import { displayName } from "../../lib/allowlist";

export async function GET(req: Request) {
  const user = readSession(req.headers.get("cookie"));
  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return Response.json({ user, name: displayName(user) });
}
