# Script to verify .env file setup

Write-Host "Verifying .env file setup..." -ForegroundColor Yellow
Write-Host ""

# Check backend .env
$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    Write-Host "✓ backend/.env file exists" -ForegroundColor Green
    
    # Read and display (masking password)
    $content = Get-Content $backendEnvPath
    Write-Host "`nFile contents (password masked):" -ForegroundColor Cyan
    foreach ($line in $content) {
        if ($line -match "DB_PASSWORD=") {
            Write-Host "  DB_PASSWORD=***" -ForegroundColor Gray
        } else {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
    
    # Check if password is set
    if ($content -match "DB_PASSWORD=2812") {
        Write-Host "`n✓ Password is set to 2812" -ForegroundColor Green
    } else {
        Write-Host "`n⚠ Password might not be set correctly" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ backend/.env file NOT FOUND" -ForegroundColor Red
    Write-Host "Creating it now..." -ForegroundColor Yellow
    
    Set-Location backend
    
    @"
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=2812

JWT_SECRET=orgit-super-secret-jwt-key-min-32-characters-long-123456789
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
"@ | Out-File -FilePath .env -Encoding utf8 -NoNewline
    
    Write-Host "✓ Created backend/.env file" -ForegroundColor Green
    Set-Location ..
}

# Check web .env
$webEnvPath = "web\.env"
if (Test-Path $webEnvPath) {
    Write-Host "`n✓ web/.env file exists" -ForegroundColor Green
} else {
    Write-Host "`n⚠ web/.env file NOT FOUND" -ForegroundColor Yellow
    Write-Host "Creating it now..." -ForegroundColor Yellow
    
    Set-Location web
    @"
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8 -NoNewline
    
    Write-Host "✓ Created web/.env file" -ForegroundColor Green
    Set-Location ..
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important: If you updated .env file, you MUST restart the backend server!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To restart backend:" -ForegroundColor Cyan
Write-Host "  1. Stop current server (Ctrl+C)" -ForegroundColor White
Write-Host "  2. Run: cd backend && npm run dev" -ForegroundColor White
Write-Host ""

