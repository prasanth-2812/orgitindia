# ORGIT Windows Quick Start Script
# This script automates the setup process for Windows users

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ORGIT Windows Quick Start Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL (try to find it)
$pgFound = $false
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe"
)

foreach ($pgPath in $pgPaths) {
    if (Test-Path $pgPath) {
        Write-Host "✓ PostgreSQL found at: $pgPath" -ForegroundColor Green
        $pgFound = $true
        $env:Path += ";$(Split-Path $pgPath)"
        break
    }
}

if (-not $pgFound) {
    Write-Host "⚠ PostgreSQL command line tools not found in PATH" -ForegroundColor Yellow
    Write-Host "  You can still use pgAdmin to set up the database" -ForegroundColor Yellow
    Write-Host "  Or install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Install Dependencies
Write-Host "Step 2: Installing Dependencies..." -ForegroundColor Yellow

Write-Host "  Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "  Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "  Installing web dependencies..." -ForegroundColor Cyan
Set-Location web
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install web dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "  Installing shared dependencies..." -ForegroundColor Cyan
Set-Location shared
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install shared dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "✓ All dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Create Environment Files
Write-Host "Step 3: Creating Environment Files..." -ForegroundColor Yellow

# Backend .env
$backendEnvPath = "backend\.env"
if (-not (Test-Path $backendEnvPath)) {
    Write-Host "  Creating backend/.env file..." -ForegroundColor Cyan
    
    $pgPassword = Read-Host "Enter PostgreSQL password for user 'postgres'" -AsSecureString
    $pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))
    
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $backendEnv = @"
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=$pgPasswordPlain

JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=7d

OTP_SERVICE_PROVIDER=twilio
OTP_SERVICE_ACCOUNT_SID=dev
OTP_SERVICE_AUTH_TOKEN=dev
OTP_SERVICE_PHONE_NUMBER=dev
OTP_EXPIRY_MINUTES=3
OTP_MAX_ATTEMPTS=3

AWS_ACCESS_KEY_ID=dev
AWS_SECRET_ACCESS_KEY=dev
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=orgit-uploads

SOCKET_CORS_ORIGIN=http://localhost:3001,http://localhost:19006

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/mpeg,audio/wav
"@
    
    $backendEnv | Out-File -FilePath $backendEnvPath -Encoding utf8 -NoNewline
    Write-Host "✓ Backend .env created" -ForegroundColor Green
} else {
    Write-Host "✓ Backend .env already exists" -ForegroundColor Green
}

# Web .env
$webEnvPath = "web\.env"
if (-not (Test-Path $webEnvPath)) {
    Write-Host "  Creating web/.env file..." -ForegroundColor Cyan
    $webEnv = @"
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
"@
    $webEnv | Out-File -FilePath $webEnvPath -Encoding utf8 -NoNewline
    Write-Host "✓ Web .env created" -ForegroundColor Green
} else {
    Write-Host "✓ Web .env already exists" -ForegroundColor Green
}

Write-Host ""

# Step 4: Database Setup Instructions
Write-Host "Step 4: Database Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to set up the database manually:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Using pgAdmin (Recommended)" -ForegroundColor White
Write-Host "  1. Open pgAdmin 4" -ForegroundColor Gray
Write-Host "  2. Connect to PostgreSQL server" -ForegroundColor Gray
Write-Host "  3. Create database named 'orgit'" -ForegroundColor Gray
Write-Host "  4. Right-click 'orgit' → Query Tool" -ForegroundColor Gray
Write-Host "  5. Open and run: setup-database-pgadmin.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Using Command Line (if psql is in PATH)" -ForegroundColor White
Write-Host "  1. Create database: psql -U postgres -c 'CREATE DATABASE orgit;'" -ForegroundColor Gray
Write-Host "  2. Run migrations: powershell -ExecutionPolicy Bypass -File run-migrations.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "After database is set up, press Enter to continue..." -ForegroundColor Yellow
Read-Host

Write-Host ""

# Step 5: Start Servers
Write-Host "Step 5: Starting Servers" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to start servers in separate terminals:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 - Backend:" -ForegroundColor White
Write-Host "  cd backend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 - Web:" -ForegroundColor White
Write-Host "  cd web" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Then open: http://localhost:3001" -ForegroundColor Green
Write-Host ""

# Final Instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set up database (see instructions above)" -ForegroundColor White
Write-Host "2. Start backend server (Terminal 1)" -ForegroundColor White
Write-Host "3. Start web server (Terminal 2)" -ForegroundColor White
Write-Host "4. Open http://localhost:3001 in browser" -ForegroundColor White
Write-Host "5. Register with mobile number: 1234567890" -ForegroundColor White
Write-Host "6. Check backend console for OTP code" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  - WINDOWS_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  - VERIFICATION_GUIDE.md" -ForegroundColor White
Write-Host ""

