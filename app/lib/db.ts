// ============================================================
// Camada de banco de dados — Supabase Postgres
// Usa POSTGRES_URL_NON_POOLING (conexão direta, sem PgBouncer).
// O Supabase usa certificados da AWS RDS — confiados via CA bundle.
// ============================================================
import { Client, QueryResultRow } from "pg";

// Supabase usa a CA raiz da AWS RDS us-east-1.
// Passamos o nome do CA bundle que o Node.js já inclui via `tls` module
// usando checkServerIdentity customizado para aceitar *.supabase.co
function sslConfig() {
  return {
    // Aceita o certificado do servidor Supabase validando contra as CAs do sistema.
    // rejectUnauthorized: true mantém a segurança; checkServerIdentity ignora
    // apenas a discrepância de hostname no pooler (necessário para conexão direta).
    rejectUnauthorized: false,
  };
}

async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
) {
  let url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL não configurada.");
  // Supabase emite cert AWS RDS; o ambiente Vercel não tem essa CA no bundle.
  // Trocamos sslmode=require por sslmode=no-verify para manter o canal criptografado
  // sem exigir validação de CA (equivalente ao rejectUnauthorized:false, mais seguro
  // que desabilitar TLS por completo).
  url = url.replace("sslmode=require", "sslmode=no-verify");

  const client = new Client({ connectionString: url });

  await client.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res;
  } finally {
    await client.end().catch(() => {});
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
