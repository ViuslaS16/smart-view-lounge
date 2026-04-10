-- Migration: UUID to Human-Readable IDs (v2 — fixed ID generation)
-- Bookings: BK-YYYYMMDD-XXXXXX (per-day counter)
-- Users:    CUST-XXXXXXXX (global sequence)

-- 1. Create sequences
CREATE SEQUENCE IF NOT EXISTS user_readable_id_seq START WITH 1;

-- 2. Create functions for ID generation (used for future inserts)
CREATE OR REPLACE FUNCTION generate_customer_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'CUST-' || LPAD(nextval('user_readable_id_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_booking_id() RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  suffix    TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');

  SELECT LPAD((COALESCE(MAX(SUBSTRING(id FROM 13)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO suffix
  FROM bookings
  WHERE id LIKE 'BK-' || today_str || '-%';

  RETURN 'BK-' || today_str || '-' || suffix;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop Foreign Keys & Constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_key;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE sms_logs DROP CONSTRAINT IF EXISTS sms_logs_booking_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

-- 4. Convert ID columns to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN id TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE password_reset_tokens ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN booking_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE sms_logs ALTER COLUMN booking_id TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN actor_id TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN target_id TYPE TEXT;

-- 5. Migrate existing data using ROW_NUMBER() to guarantee unique IDs
--    Users: CUST-00000001, CUST-00000002, ... ordered by created_at
CREATE TEMP TABLE user_id_map AS
SELECT
  id AS old_id,
  'CUST-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)::TEXT, 8, '0') AS new_id
FROM users
WHERE id NOT LIKE 'CUST-%';  -- Skip any already-converted rows

--    Bookings: BK-YYYYMMDD-000001 per day, ordered by created_at within each day
CREATE TEMP TABLE booking_id_map AS
SELECT
  id AS old_id,
  'BK-' || to_char(created_at AT TIME ZONE 'Asia/Colombo', 'YYYYMMDD') || '-' ||
  LPAD(ROW_NUMBER() OVER (
    PARTITION BY DATE(created_at AT TIME ZONE 'Asia/Colombo')
    ORDER BY created_at ASC, id ASC
  )::TEXT, 6, '0') AS new_id
FROM bookings
WHERE id NOT LIKE 'BK-%';  -- Skip any already-converted rows

-- Advance the sequence past the number of users we are migrating
SELECT setval('user_readable_id_seq', COALESCE((SELECT COUNT(*) FROM user_id_map), 0));

-- Update Users
UPDATE users u SET id = m.new_id FROM user_id_map m WHERE u.id = m.old_id;

-- Update Bookings (using both maps)
UPDATE bookings b SET id = m.new_id FROM booking_id_map m WHERE b.id = m.old_id;
UPDATE bookings b SET user_id = m.new_id FROM user_id_map m WHERE b.user_id = m.old_id;

-- Update References
UPDATE password_reset_tokens t SET user_id = m.new_id FROM user_id_map m WHERE t.user_id = m.old_id;
UPDATE payments p SET booking_id = m.new_id FROM booking_id_map m WHERE p.booking_id = m.old_id;
UPDATE payments p SET user_id = m.new_id FROM user_id_map m WHERE p.user_id = m.old_id;
UPDATE sms_logs s SET booking_id = m.new_id FROM booking_id_map m WHERE s.booking_id = m.old_id;
UPDATE audit_logs a SET actor_id = m.new_id FROM user_id_map m WHERE a.actor_id = m.old_id;
UPDATE audit_logs a SET target_id = m.new_id FROM user_id_map m WHERE a.target_id = m.old_id AND target_type = 'user';
UPDATE audit_logs a SET target_id = m.new_id FROM booking_id_map m WHERE a.target_id = m.old_id AND target_type = 'booking';

-- 6. Set Defaults for future records
ALTER TABLE users ALTER COLUMN id SET DEFAULT generate_customer_id();
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT generate_booking_id();

-- 7. Restore Foreign Keys & Constraints
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_key UNIQUE (user_id);
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
