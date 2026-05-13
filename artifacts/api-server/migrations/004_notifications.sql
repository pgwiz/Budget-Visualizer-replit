-- Migration 004: notifications + enriched audit trail
-- Run via API server startup or psql

-- ──────────────────────────────────────────────
-- Notifications
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  actor_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type   VARCHAR(60) NOT NULL,
  entity_type   VARCHAR(40) NOT NULL,
  entity_id     INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id              SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  UNIQUE (notification_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_recipients_recipient ON notification_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipients_unread    ON notification_recipients(recipient_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_actor        ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created      ON notifications(created_at DESC);
