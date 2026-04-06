-- Payments table
CREATE TYPE payment_type   AS ENUM ('booking', 'extension');
CREATE TYPE payment_status AS ENUM ('success', 'failed', 'refunded');

CREATE TABLE payments (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID           NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id             UUID           NOT NULL REFERENCES users(id),
  payhere_payment_id  TEXT           UNIQUE,
  payhere_order_id    TEXT,
  amount              NUMERIC(10,2)  NOT NULL,
  type                payment_type   DEFAULT 'booking',
  status              payment_status DEFAULT 'success',
  raw_webhook         JSONB,         -- Full PayHere payload stored for audit
  paid_at             TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_user_id    ON payments(user_id);
CREATE INDEX idx_payments_status     ON payments(status);
