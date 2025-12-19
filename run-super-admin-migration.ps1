# Script to run the super admin role migration
# This updates the users table to allow 'super_admin' role

Write-Host "=== Running Super Admin Role Migration ===" -ForegroundColor Cyan
Write-Host ""

$migrationFile = "database\migrations\016_add_super_admin_role.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration SQL:" -ForegroundColor Yellow
Get-Content $migrationFile
Write-Host ""

Write-Host "To run this migration:" -ForegroundColor Yellow
Write-Host "1. Open pgAdmin 4" -ForegroundColor White
Write-Host "2. Connect to PostgreSQL server" -ForegroundColor White
Write-Host "3. Navigate to: Servers → PostgreSQL → Databases → orgit" -ForegroundColor White
Write-Host "4. Right-click 'orgit' → Query Tool" -ForegroundColor White
Write-Host "5. Copy and paste the SQL above" -ForegroundColor White
Write-Host "6. Click Execute (or press F5)" -ForegroundColor White
Write-Host ""

Write-Host "OR if psql is in your PATH:" -ForegroundColor Yellow
Write-Host "psql -U postgres -d orgit -f $migrationFile" -ForegroundColor Cyan
Write-Host ""

Write-Host "After running the migration, verify with:" -ForegroundColor Yellow
Write-Host "SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name = 'users_role_check';" -ForegroundColor Cyan
Write-Host ""

