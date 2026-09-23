-- NEXT data model — baseline migration.
-- All statements are idempotent (safe to run on every boot).

-- Enum types ---------------------------------------------------------------
-- NOTE: commitment.type is INTERNAL ONLY. The UI never presents it as a
-- user-facing category choice; it is inferred by the LLM extraction step.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commitment_type') THEN
    CREATE TYPE commitment_type AS ENUM ('task', 'deadline', 'meeting', 'reminder');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commitment_status') THEN
    CREATE TYPE commitment_status AS ENUM ('open', 'waiting', 'done');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proactivity_level') THEN
    CREATE TYPE proactivity_level AS ENUM ('quiet', 'balanced', 'active');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nudge_status') THEN
    CREATE TYPE nudge_status AS ENUM ('open', 'resolved', 'dismissed');
  END IF;
END $$;

-- Tables -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT,
  proactivity_level proactivity_level NOT NULL DEFAULT 'balanced',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS commitments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_input           TEXT NOT NULL,
  type                commitment_type NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            TIMESTAMPTZ,
  status              commitment_status NOT NULL DEFAULT 'open',
  linked_commitment_id UUID REFERENCES commitments(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nudges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('conflict', 'due', 'waiting')),
  message       TEXT NOT NULL,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE,
  source_key    TEXT,
  status        nudge_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  UNIQUE (user_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_nudges_user_status ON nudges(user_id, status);

CREATE INDEX IF NOT EXISTS idx_commitments_user_id       ON commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status         ON commitments(status);
CREATE INDEX IF NOT EXISTS idx_commitments_due_date       ON commitments(due_date);
CREATE INDEX IF NOT EXISTS idx_commitments_linked          ON commitments(linked_commitment_id);

-- Auto-maintain updated_at --------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_commitments_updated_at ON commitments;
CREATE TRIGGER trg_commitments_updated_at
  BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
