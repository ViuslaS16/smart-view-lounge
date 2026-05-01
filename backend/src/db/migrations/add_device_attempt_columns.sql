-- Migration: add device attempt counters to bookings table
-- These columns track how many times the scheduler has tried to
-- start/stop devices for a booking, enabling a max-retry cap
-- so the cron job doesn't loop forever on broken hardware.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS devices_start_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devices_stop_attempts  INT NOT NULL DEFAULT 0;
