-- Update user role for mobile number 1234567890
-- Mobile numbers are stored with country code prefix (e.g., +911234567890)

-- Update role to 'admin' for user with mobile ending in 1234567890
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE mobile LIKE '%1234567890';

-- Verify the update
SELECT id, mobile, name, role, status 
FROM users 
WHERE mobile LIKE '%1234567890';

-- If you want to update to super_admin instead, use:
-- UPDATE users 
-- SET role = 'super_admin', updated_at = CURRENT_TIMESTAMP
-- WHERE mobile LIKE '%1234567890';

