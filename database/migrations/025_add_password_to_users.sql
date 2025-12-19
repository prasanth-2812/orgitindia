-- Add password_hash column to users table for password-based authentication
-- This column is nullable to support existing OTP-only users

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password. Nullable for users who only use OTP authentication.';

