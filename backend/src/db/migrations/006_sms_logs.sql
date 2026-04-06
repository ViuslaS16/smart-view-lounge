-- SMS delivery log — track every message sent
CREATE TABLE sms_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  recipient   TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL,  -- 'admin_on' | '15min' | 'end' | 'admin_off' | 'extension'
  status      TEXT        DEFAULT 'sent',
  error       TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_booking_id ON sms_logs(booking_id);
CREATE INDEX idx_sms_type       ON sms_logs(type);
CREATE INDEX idx_sms_sent_at    ON sms_logs(sent_at DESC);
