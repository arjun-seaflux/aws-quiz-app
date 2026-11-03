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

-- ═══ v2 additions (all idempotent) ═══════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at  timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal         int     NOT NULL DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_optin  boolean NOT NULL DEFAULT false;

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'paper';   -- paper | practice | room

ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS src_paper int;   -- which question this answer was for
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS src_pos   int;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS secs      int;   -- time spent on the question
UPDATE attempt_answers aa SET src_paper = a.paper_num, src_pos = aa.position
  FROM attempts a WHERE a.id = aa.attempt_id AND aa.src_paper IS NULL;
CREATE INDEX IF NOT EXISTS attempt_answers_src_idx ON attempt_answers (src_paper, src_pos);

-- Server-side autosave so an unfinished exam can be resumed on any device
CREATE TABLE IF NOT EXISTS drafts (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_num  int  NOT NULL,
  state      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paper_num)
);

-- Spaced-repetition flashcards (Leitner boxes)
CREATE TABLE IF NOT EXISTS cards (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  src_paper  int  NOT NULL,
  src_pos    int  NOT NULL,
  box        int  NOT NULL DEFAULT 0,
  due_at     timestamptz NOT NULL DEFAULT now(),
  reps       int  NOT NULL DEFAULT 0,
  lapses     int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, src_paper, src_pos)
);
CREATE INDEX IF NOT EXISTS cards_due_idx ON cards (user_id, due_at);

-- Bookmarks + personal comments on questions and note topics
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,            -- 'question' | 'note'
  ref        text NOT NULL,            -- "paper:pos" or topic id
  comment    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, ref)
);

CREATE TABLE IF NOT EXISTS question_reports (
  id         serial PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  src_paper  int NOT NULL,
  src_pos    int NOT NULL,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'open',   -- open | resolved | dismissed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        int NOT NULL DEFAULT 0
);

-- Password-reset and email-verification tokens (only a hash is stored)
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,            -- 'reset' | 'verify'
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

CREATE TABLE IF NOT EXISTS client_errors (
  id         serial PRIMARY KEY,
  message    text,
  stack      text,
  url        text,
  user_agent text,
  user_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Friend competitions
CREATE TABLE IF NOT EXISTS rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  host_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_num    int  NOT NULL,
  positions    int[] NOT NULL,          -- the shared question set, in order
  duration_min int  NOT NULL,
  max_players  int  NOT NULL DEFAULT 20,
  status       text NOT NULL DEFAULT 'lobby',   -- lobby | live | finished
  starts_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS room_players (
  room_id     uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  answers     jsonb,
  answered    int  NOT NULL DEFAULT 0,
  finished_at timestamptz,
  score_pct   int,
  correct     int,
  time_taken  int,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS room_players_user_idx ON room_players (user_id);
