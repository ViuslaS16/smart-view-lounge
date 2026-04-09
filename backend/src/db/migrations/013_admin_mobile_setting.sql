-- Add admin_mobile to settings table (managed via UI with OTP verification)
-- Also add new_user SMS template for admin alerts on registration
INSERT INTO settings (key, value) VALUES
  ('admin_mobile',          ''),
  ('sms_new_user_template', 'SmartView: New user registered and awaiting NIC verification')
ON CONFLICT (key) DO NOTHING;
