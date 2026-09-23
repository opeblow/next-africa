-- Indexes supporting keyset pagination and the dashboard/nudge hot paths.

CREATE INDEX IF NOT EXISTS idx_commitments_user_created
  ON commitments(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_commitments_user_status_due
  ON commitments(user_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_nudges_user_status_created
  ON nudges(user_id, status, created_at DESC);
