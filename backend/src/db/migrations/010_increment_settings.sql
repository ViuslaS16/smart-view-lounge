-- Add time increment and increment pricing settings
INSERT INTO settings (key, value) VALUES
  ('time_increment_minutes', '30'),
  ('time_increment_price',   '1250')
ON CONFLICT (key) DO NOTHING;
