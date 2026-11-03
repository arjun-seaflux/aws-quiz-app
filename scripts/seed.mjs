// Applies db/schema.sql and loads papers, questions and notes into Postgres.
// Usage: npm run db:seed   (needs DATABASE_URL, e.g. via .env.local)
import SCHEMA from "../db/schema.js";
import pg from "pg";

import { paper1 } from "../src/assets/Papers/ND/Paper1.js";
import { paper2 } from "../src/assets/Papers/ND/Paper2.js";
import { paper3 } from "../src/assets/Papers/ND/Paper3.js";
import { paper4 } from "../src/assets/Papers/ND/Paper4.js";
import { paper5 } from "../src/assets/Papers/ND/Paper5.js";
import { paper6 } from "../src/assets/Papers/ND/Paper6.js";
import { SM_paper1 } from "../src/assets/Papers/SM/SM_Paper1.js";
import { SM_paper2 } from "../src/assets/Papers/SM/SM_Paper2.js";
import { SM_paper3 } from "../src/assets/Papers/SM/SM_Paper3.js";
import { SM_paper4 } from "../src/assets/Papers/SM/SM_Paper4.js";
import { SM_paper5 } from "../src/assets/Papers/SM/SM_Paper5.js";
import { SM_paper6 } from "../src/assets/Papers/SM/SM_Paper6.js";
import { NOTES_TOPICS } from "../src/notes.js";

// Keep in sync with src/papers.js
const PAPERS = [
  [1, "Practice Paper 1", paper1], [2, "Practice Paper 2", paper2],
  [3, "Practice Paper 3", paper3], [4, "Practice Paper 4", paper4],
  [5, "Practice Paper 5", paper5], [6, "Practice Paper 6", paper6],
  [7, "SM Paper 1", SM_paper1], [8, "SM Paper 2", SM_paper2],
  [9, "SM Paper 3", SM_paper3], [10, "SM Paper 4", SM_paper4],
  [11, "SM Paper 5", SM_paper5], [12, "SM Paper 6", SM_paper6],
];

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }

const client = new pg.Client({
  connectionString: url,
  ssl: /sslmode=require|neon\.tech/.test(url) ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

try {
  await client.query("BEGIN");
  await client.query(SCHEMA);

  const schemaOnly = process.argv.includes("--schema-only");
  const reset = process.argv.includes("--reset");
  const existing = (await client.query("SELECT COUNT(*)::int AS n FROM questions")).rows[0].n;
  if (schemaOnly || (existing > 0 && !reset)) {
    await client.query("COMMIT");
    console.log(schemaOnly
      ? "Schema is up to date."
      : `Schema is up to date. Content already loaded (${existing} questions) — left untouched. Use --reset to overwrite it.`);
    await client.end();
    process.exit(0);
  }

  // Content is replaced wholesale; user data (users/attempts) is untouched.
  // Community-authored questions (paper_num >= 10000) are user data and are never touched.
  await client.query("DELETE FROM questions WHERE paper_num < 10000");
  await client.query("DELETE FROM papers WHERE num < 10000");
  await client.query("DELETE FROM topics");

  let qCount = 0;
  for (const [num, name, questions] of PAPERS) {
    await client.query("INSERT INTO papers (num, name) VALUES ($1, $2)", [num, name]);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(
        "INSERT INTO questions (paper_num, position, qid, data) VALUES ($1,$2,$3,$4)",
        [num, i, q.id ?? `p${num}q${i + 1}`, JSON.stringify(q)],
      );
      qCount++;
    }
  }
  for (let i = 0; i < NOTES_TOPICS.length; i++) {
    const t = NOTES_TOPICS[i];
    await client.query("INSERT INTO topics (id, position, data) VALUES ($1,$2,$3)", [t.id, i, JSON.stringify(t)]);
  }
  await client.query("COMMIT");
  console.log(`Seeded ${PAPERS.length} papers, ${qCount} questions, ${NOTES_TOPICS.length} topics.`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
