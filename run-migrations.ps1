# PowerShell script to run all database migrations
# Usage: powershell -ExecutionPolicy Bypass -File run-migrations.ps1

$migrationsPath = "database\migrations"
$dbName = "orgit"
$dbUser = "postgres"
$dbPassword = Read-Host "Enter PostgreSQL password for user '$dbUser'" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

Write-Host "Running migrations for database: $dbName" -ForegroundColor Green

# Get all migration files sorted by name
$migrations = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Sort-Object Name

if ($migrations.Count -eq 0) {
    Write-Host "No migration files found in $migrationsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($migrations.Count) migration files" -ForegroundColor Yellow

foreach ($migration in $migrations) {
    Write-Host "`nRunning: $($migration.Name)..." -ForegroundColor Cyan
    
    $env:PGPASSWORD = $dbPasswordPlain
    $result = & psql -U $dbUser -d $dbName -f $migration.FullName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully applied: $($migration.Name)" -ForegroundColor Green
    } else {
        Write-Host "✗ Error applying: $($migration.Name)" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        $env:PGPASSWORD = $null
        exit 1
    }
}

$env:PGPASSWORD = $null
Write-Host "`n✓ All migrations completed successfully!" -ForegroundColor Green

