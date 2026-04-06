-- Users table
CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended');
CREATE TYPE user_role   AS ENUM ('customer', 'admin');

CREATE TABLE users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT        NOT NULL,
  email            TEXT        UNIQUE NOT NULL,
  mobile           TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL,
  nic_number       TEXT,
  nic_image_key    TEXT,                           -- Cloudflare R2 object key
  status           user_status DEFAULT 'pending_verification',
  role             user_role   DEFAULT 'customer',
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_mobile  ON users(mobile);
CREATE INDEX idx_users_status  ON users(status);
CREATE INDEX idx_users_role    ON users(role);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
