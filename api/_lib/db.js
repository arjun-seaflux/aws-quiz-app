import pg from "pg";

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

export const query = (text, params) => pool.query(text, params);

export async function withTx(fn) {
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
