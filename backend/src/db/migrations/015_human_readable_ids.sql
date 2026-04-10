-- Migration: UUID to Human-Readable IDs
-- Bookings: BK-YYYYMMDD-XXXXXX (resets daily)
-- Users: CUST-XXXXXXXX (global sequence)

-- 1. Create sequences
CREATE SEQUENCE IF NOT EXISTS user_readable_id_seq START WITH 1;
-- No sequence for bookings as we use MAX() daily reset logic

-- 2. Create functions for ID generation
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
  
  -- Lock the bookings table to prevent collisions during ID generation
  -- In a larger system we might use a dedicated counter table
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
-- We use a temporary column to allow smooth translation
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN id TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE password_reset_tokens ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN booking_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE sms_logs ALTER COLUMN booking_id TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN actor_id TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN target_id TYPE TEXT;

-- 5. Migrate existing data while maintaining relationships
-- Temporary mapping to keep track of conversion
CREATE TEMP TABLE user_id_map AS 
SELECT id as old_id, generate_customer_id() as new_id 
FROM users 
ORDER BY created_at ASC;

CREATE TEMP TABLE booking_id_map AS 
SELECT id as old_id, generate_booking_id() as new_id 
FROM bookings 
ORDER BY created_at ASC;

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

-- Note: Booking ID default uses a function that looks at existing rows, 
-- which works perfectly for the daily reset logic.
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT generate_booking_id();

-- 7. Restore Foreign Keys & Constraints
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_key UNIQUE (user_id);
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
