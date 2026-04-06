-- App settings — admin-configurable values
CREATE TABLE settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('price_per_hour',       '2500'),
  ('buffer_minutes',       '15'),
  ('min_duration_minutes', '60'),
  ('max_duration_minutes', '480'),
  ('currency',             'LKR'),
  ('sms_15min_template',   'SmartView Lounge: Your session ends in 15 minutes.'),
  ('sms_end_template',     'SmartView Lounge: Your session has ended. Thank you for visiting!'),
  ('sms_admin_on',         'SmartView: New booking confirmed. Please turn ON the theater.'),
  ('sms_admin_off',        'SmartView: Session ended. Please turn OFF AC and projector.'),
  ('sms_extension',        'SmartView Lounge: Your session has been extended successfully.');
