-- Tuya Smart Automation columns for bookings
-- Stores the door PIN and tracks device automation state per session

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS door_pin           VARCHAR(12),
  ADD COLUMN IF NOT EXISTS tuya_ticket_id     VARCHAR(512),
  ADD COLUMN IF NOT EXISTS pin_sms_sent       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS devices_started    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS devices_stopped    BOOLEAN DEFAULT FALSE;

-- Index to efficiently find bookings that need device automation
CREATE INDEX IF NOT EXISTS idx_bookings_devices_started ON bookings(devices_started, status, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_devices_stopped ON bookings(devices_stopped, status, end_time);
