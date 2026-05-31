// ============================================================
// Rate limiting — sliding window
//
// Modo 1 (padrão): in-memory por instância serverless.
//   Funciona imediatamente, sem configuração extra.
//   Atenção: cada instância Vercel tem seu próprio contador.
//   Adequado para proteção razoável sem Redis.
//
// Modo 2 (recomendado para produção com muitos usuários):
//   Adicione UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   nas env vars da Vercel. O rate limiting passa a ser global
//   (compartilhado entre todas as instâncias).
// ============================================================

interface Window {
  count: number;
  resetAt: number;
}

// In-memory store: key → { count, resetAt }
const store = new Map<string, Window>();

// Limpa entradas expiradas periodicamente para não crescer indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}, 60_000);

/** Verifica e incrementa o contador para a chave dada.
 *  @param key    Identificador único (ex: "login:1.2.3.4")
 *  @param limit  Máximo de requests permitidos na janela
 *  @param windowSecs  Duração da janela em segundos
 *  @returns { allowed, remaining, resetAt }
 */
async function checkInMemory(key: string, limit: number, windowSecs: number) {
  const now = Date.now();
  let w = store.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowSecs * 1000 };
    store.set(key, w);
  }
  w.count++;
  return {
    allowed: w.count <= limit,
    remaining: Math.max(0, limit - w.count),
    resetAt: w.resetAt,
  };
}

/** Verifica rate limit via Upstash Redis REST API (global entre instâncias). */
async function checkUpstash(key: string, limit: number, windowSecs: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // não configurado

  try {
    // INCR + EXPIRE atômico via pipeline
    const pipeline = [
      ["INCR", key],
      ["EXPIRE", key, String(windowSecs), "NX"],
    ];
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(pipeline),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ result: number }>;
    const count = data[0]?.result ?? 1;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + windowSecs * 1000,
    };
  } catch {
    return null; // falha → deixa passar (fail-open)
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSecs: number
) {
  const upstash = await checkUpstash(key, limit, windowSecs);
  if (upstash) return upstash;
  return checkInMemory(key, limit, windowSecs);
}

// Limites pré-configurados por endpoint
export const LIMITS = {
  login:    { limit: 5,  windowSecs: 15 * 60 }, // 5 tentativas / 15 min por IP
  register: { limit: 3,  windowSecs: 60 * 60 }, // 3 cadastros / hora por IP
  chat:     { limit: 30, windowSecs: 60 },       // 30 msgs / min por usuário
} as const;

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Retorna uma Response 429 padronizada. */
export function tooManyRequests(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Muitas tentativas. Tente novamente em instantes." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
