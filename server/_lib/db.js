import pg from "pg";
import SCHEMA from "../../db/schema.js";

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Reused across invocations of a warm serverless instance.
const g = globalThis;
export const pool =
  g.__quizPool ??
  (g.__quizPool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    ssl: /sslmode=require|neon\.tech/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  }));

// The schema is idempotent, so each warm instance applies it once before its first query.
// An advisory lock stops concurrent cold starts from running the DDL at the same time.
let migration = null;
function ensureSchema() {
  migration ??= (async () => {
    if (!connectionString) return;
    const c = await pool.connect();
    try {
      await c.query("SELECT pg_advisory_lock(727274)");
      await c.query(SCHEMA);
    } finally {
      await c.query("SELECT pg_advisory_unlock(727274)").catch(() => {});
      c.release();
    }
  })().catch((e) => { migration = null; throw e; });
  return migration;
}

export async function query(text, params) {
  await ensureSchema();
  return pool.query(text, params);
}

export async function withTx(fn) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export const dbConfigured = Boolean(connectionString);
