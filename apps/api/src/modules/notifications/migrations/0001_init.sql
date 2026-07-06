CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(50) NOT NULL,
  recipient varchar(320) NOT NULL,
  subject varchar(255),
  payload jsonb,
  status varchar(50) NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying logs by status (e.g. finding pending or failed ones)
CREATE INDEX IF NOT EXISTS notification_logs_status_idx ON notification_logs (status);

-- Index for querying logs by type and recipient (e.g. finding all emails sent to a user)
CREATE INDEX IF NOT EXISTS notification_logs_type_recipient_idx ON notification_logs (type, recipient);
