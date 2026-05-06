-- ============================================================
-- Migration 016: Fix rejected-but-still-pending bookings
-- ============================================================
-- Root cause:
--   Before this fix, when an admin rejected a payment the booking
--   was left as status='pending', payment_status='rejected'.
--   The DB EXCLUDE constraint (no_time_overlap) only exempts rows
--   where status='cancelled', so those rows permanently blocked
--   their time slots even though the API showed them as free.
--
-- This migration cancels any such stuck rows so their slots are
-- immediately released and available for new bookings.
-- ============================================================

UPDATE bookings
SET
  status     = 'cancelled',
  updated_at = NOW()
WHERE status         = 'pending'
  AND payment_status = 'rejected';

-- Verification query (should return 0 rows after migration):
-- SELECT id, start_time, end_time, status, payment_status
-- FROM bookings
-- WHERE status = 'pending' AND payment_status = 'rejected';
