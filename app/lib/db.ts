// ============================================================
// Camada de banco de dados — Supabase Postgres
// Usa POSTGRES_URL_NON_POOLING (conexão direta, sem PgBouncer)
// pois o PgBouncer (pooler) do Supabase não suporta transações
// e o Pool do pg conflita com ele na porta 6543.
// ============================================================
import { Client } from "pg";

async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL não configurada.");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res;
  } finally {
    await client.end();
  }
}

// Cria a tabela de usuários caso ainda não exista (idempotente).
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

export async function userExists(username: string): Promise<boolean> {
  const res = await query(
    "SELECT 1 FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return res.rows.length > 0;
}
