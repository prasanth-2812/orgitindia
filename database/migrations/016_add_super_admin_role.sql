-- Add super_admin role to users table
-- This migration updates the CHECK constraint to allow 'super_admin' role

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with super_admin role
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee', 'super_admin'));

