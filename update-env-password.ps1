# Script to update database password in backend/.env file
# Run this if you need to fix the password

Write-Host "Updating database password in backend/.env..." -ForegroundColor Yellow
Write-Host ""

# Get password securely
$pgPassword = Read-Host "Enter your PostgreSQL password for user 'postgres'" -AsSecureString
$pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))

# Generate JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | ForEach-Object {[char]$_})

# Navigate to backend
Set-Location backend

# Create .env file
$envContent = @"
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

$envContent | Out-File -FilePath .env -Encoding utf8 -Force

Write-Host ""
Write-Host "✓ backend/.env file updated with correct password!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Stop the backend server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Restart it: npm run dev" -ForegroundColor White
Write-Host "3. Test the connection" -ForegroundColor White
Write-Host ""

Set-Location ..

