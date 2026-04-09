-- Migration: 012_relax_duration_constraint.sql
-- The original CHECK (duration_minutes >= 60) was hardcoded to 60 minutes.
-- The minimum duration is now dynamically configurable via admin settings
-- and enforced at the application layer. Relax the DB constraint to >= 15
-- (an absolute floor) so that admin changes don't cause DB errors.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_duration_minutes_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_duration_minutes_check CHECK (duration_minutes >= 15);
