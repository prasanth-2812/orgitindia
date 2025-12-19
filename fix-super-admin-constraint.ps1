# Script to fix the super_admin role constraint issue

Write-Host "=== Fix Super Admin Role Constraint ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "The constraint already exists but might not include 'super_admin'." -ForegroundColor Yellow
Write-Host ""

Write-Host "Run this SQL in pgAdmin Query Tool:" -ForegroundColor Yellow
Write-Host ""

$sql = @"
-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with super_admin role
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee', 'super_admin'));

-- Verify it worked
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';
"@

Write-Host $sql -ForegroundColor Cyan
Write-Host ""

Write-Host "Steps:" -ForegroundColor Yellow
Write-Host "1. Open pgAdmin 4" -ForegroundColor White
Write-Host "2. Connect to PostgreSQL" -ForegroundColor White
Write-Host "3. Navigate to: Servers → PostgreSQL → Databases → orgit" -ForegroundColor White
Write-Host "4. Right-click 'orgit' → Query Tool" -ForegroundColor White
Write-Host "5. Copy and paste the SQL above" -ForegroundColor White
Write-Host "6. Execute (F5)" -ForegroundColor White
Write-Host ""

Write-Host "After running, you should see:" -ForegroundColor Yellow
Write-Host "  role IN ('admin', 'employee', 'super_admin')" -ForegroundColor Green
Write-Host ""

Write-Host "Then update your user:" -ForegroundColor Yellow
Write-Host "  UPDATE users SET role = 'super_admin' WHERE mobile = '9652824932';" -ForegroundColor Cyan
Write-Host ""

