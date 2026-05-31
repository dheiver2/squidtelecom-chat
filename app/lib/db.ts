// ============================================================
// Banco de dados — Supabase Postgres
// Pool global singleton: reutilizado entre invocações warm do
// serverless (evita nova conexão TCP a cada request).
// Usa o POOLER do Supabase (porta 6543 / PgBouncer) que é
// projetado para alta concorrência serverless.
// ============================================================
import { Pool, QueryResultRow } from "pg";

// Singleton global — persiste entre requests na mesma instância warm.
const g = globalThis as typeof globalThis & { _a1pool?: Pool };

function getPool(): Pool {
  if (!g._a1pool) {
    const url = (
      process.env.POSTGRES_URL ||           // pooler (preferencial)
      process.env.POSTGRES_URL_NON_POOLING  // fallback direto
    )?.replace("sslmode=require", "sslmode=no-verify");

    if (!url) throw new Error("POSTGRES_URL não configurada.");

    g._a1pool = new Pool({
      connectionString: url,
      // max pequeno por instância: o PgBouncer gerencia o pool real.
      // Com Vercel auto-scaling (N instâncias × max:3 = N×3 conexões ao PgBouncer).
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    g._a1pool.on("error", (err) => {
      console.error("Pool error:", err.message);
      // Força recriação no próximo request
      g._a1pool = undefined;
    });
  }
  return g._a1pool;
}

async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await client.query<T>(sql, params);
  } finally {
    client.release();
  }
}

// Cria a tabela de usuários (idempotente). Chame uma vez, não em cada request.
export async function migrateDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createUser(username: string, passwordHash: string) {
  await query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
    [username, passwordHash]
  );
}

export async function findUser(username: string): Promise<{ password_hash: string } | null> {
  const res = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return res.rows[0] ?? null;
}

export async function updatePasswordHash(username: string, newHash: string) {
  await query(
    "UPDATE users SET password_hash = $1 WHERE username = $2",
    [newHash, username]
  );
}

export async function userExists(username: string): Promise<boolean> {
  const res = await query(
    "SELECT 1 FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return res.rows.length > 0;
}

// ============================================================
// Conversas — sync server-side
// ============================================================

export interface ConversationRow {
  id: string;
  title: string;
  model: string | null;
  messages: Array<{ role: string; content: string }>;
  updated_at: string;
}

export async function migrateConversations() {
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,
      username    TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT 'Nova conversa',
      model       TEXT,
      messages    JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS conv_user_idx ON conversations(username, updated_at DESC)`
  );
}

export async function listConversations(username: string): Promise<ConversationRow[]> {
  const res = await query<ConversationRow>(
    `SELECT id, title, model, messages, updated_at
     FROM conversations WHERE username = $1
     ORDER BY updated_at DESC LIMIT 200`,
    [username]
  );
  return res.rows;
}

export async function upsertConversation(
  id: string,
  username: string,
  title: string,
  messages: unknown[],
  model: string | null
) {
  await query(
    `INSERT INTO conversations (id, username, title, messages, model, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       title      = EXCLUDED.title,
       messages   = EXCLUDED.messages,
       model      = EXCLUDED.model,
       updated_at = NOW()`,
    [id, username, title, JSON.stringify(messages), model]
  );
}

export async function deleteConversationDb(id: string, username: string) {
  await query(
    "DELETE FROM conversations WHERE id = $1 AND username = $2",
    [id, username]
  );
}
