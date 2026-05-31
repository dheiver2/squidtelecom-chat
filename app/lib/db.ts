// ============================================================
// Camada de banco de dados — Supabase Postgres (via pg pooler)
// Variável de ambiente: POSTGRES_URL (connection string do Supabase pooler)
// ============================================================
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL não configurada.");
    pool = new Pool({ connectionString: url, max: 3, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

// Cria a tabela de usuários caso ainda não exista (idempotente).
export async function migrateDb() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export async function createUser(username: string, passwordHash: string) {
  const client = await getPool().connect();
  try {
    await client.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [username, passwordHash]
    );
  } finally {
    client.release();
  }
}

export async function findUser(username: string): Promise<{ password_hash: string } | null> {
  const client = await getPool().connect();
  try {
    const res = await client.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    return res.rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function userExists(username: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      "SELECT 1 FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    return res.rows.length > 0;
  } finally {
    client.release();
  }
}
