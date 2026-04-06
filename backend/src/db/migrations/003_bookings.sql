-- Bookings table
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE bookings (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_time          TIMESTAMPTZ    NOT NULL,
  end_time            TIMESTAMPTZ    NOT NULL,
  duration_minutes    INTEGER        NOT NULL CHECK (duration_minutes >= 60),
  status              booking_status DEFAULT 'pending',
  total_amount        NUMERIC(10,2)  NOT NULL CHECK (total_amount > 0),
  payhere_order_id    TEXT           UNIQUE,
  sms_15min_sent      BOOLEAN        DEFAULT FALSE,
  sms_end_sent        BOOLEAN        DEFAULT FALSE,
  sms_admin_off_sent  BOOLEAN        DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ    DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    DEFAULT NOW(),

  -- Prevent time overlaps at the database level (requires btree_gist extension)
  CONSTRAINT no_time_overlap EXCLUDE USING gist (
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled'))
);

CREATE INDEX idx_bookings_user_id    ON bookings(user_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_order_id   ON bookings(payhere_order_id);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
