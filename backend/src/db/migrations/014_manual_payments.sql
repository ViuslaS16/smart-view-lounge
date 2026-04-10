-- Manual Payment Columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'; -- pending, pending_verification, verified, rejected
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS receipt_image_key TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;

-- Index for analytics & fast lookup
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
