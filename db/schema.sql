-- AWS Quiz schema (PostgreSQL / Neon). Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS papers (
  num  int PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id        serial PRIMARY KEY,
  paper_num int  NOT NULL REFERENCES papers(num) ON DELETE CASCADE,
  position  int  NOT NULL,
  qid       text NOT NULL,
  data      jsonb NOT NULL,
  UNIQUE (paper_num, position)
);

CREATE TABLE IF NOT EXISTS topics (
  id       text PRIMARY KEY,
  position int  NOT NULL,
  data     jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_num  int  NOT NULL,
  score_pct  int  NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  correct    int  NOT NULL,
  wrong      int  NOT NULL,
  skipped    int  NOT NULL,
  total      int  NOT NULL,
  time_taken int,
  source     text NOT NULL DEFAULT 'quiz',   -- 'quiz' | 'import'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_user_created_idx ON attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attempts_user_paper_idx   ON attempts (user_id, paper_num);

CREATE TABLE IF NOT EXISTS attempt_answers (
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position   int  NOT NULL,
  qid        text NOT NULL,
  selected   jsonb,          -- null | "answer text" | ["a", "b"]
  is_correct boolean NOT NULL,
  PRIMARY KEY (attempt_id, position)
);
