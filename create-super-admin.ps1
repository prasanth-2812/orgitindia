# PowerShell Script to Create/Update Super Admin User
# This script helps you create or update a user to super_admin role

Write-Host "=== Create Super Admin User ===" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
$psqlAvailable = $false
try {
    $null = Get-Command psql -ErrorAction Stop
    $psqlAvailable = $true
} catch {
    Write-Host "Note: psql command not found. You'll need to use pgAdmin instead." -ForegroundColor Yellow
}

Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "1. Update existing user to super_admin" -ForegroundColor White
Write-Host "2. Create new super_admin user" -ForegroundColor White
Write-Host "3. View all super_admin users" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or 3)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Update Existing User to Super Admin" -ForegroundColor Yellow
    Write-Host ""
    $mobile = Read-Host "Enter the mobile number of the user to update"
    
    if ($psqlAvailable) {
        Write-Host ""
        Write-Host "Running SQL command..." -ForegroundColor Yellow
        $sql = "UPDATE users SET role = 'super_admin' WHERE mobile = '$mobile';"
        $env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString | ConvertFrom-SecureString -AsPlainText
        psql -U postgres -d orgit -c $sql
        Write-Host ""
        Write-Host "User updated! You can now login with mobile: $mobile" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Please run this SQL in pgAdmin Query Tool:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "UPDATE users SET role = 'super_admin' WHERE mobile = '$mobile';" -ForegroundColor Cyan
        Write-Host ""
    }
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Create New Super Admin User" -ForegroundColor Yellow
    Write-Host ""
    $mobile = Read-Host "Enter mobile number (e.g., 1234567890)"
    $name = Read-Host "Enter name (e.g., Super Admin)"
    
    if ($psqlAvailable) {
        Write-Host ""
        Write-Host "Running SQL command..." -ForegroundColor Yellow
        $sql = "INSERT INTO users (mobile, name, role, status) VALUES ('$mobile', '$name', 'super_admin', 'active');"
        $env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString | ConvertFrom-SecureString -AsPlainText
        psql -U postgres -d orgit -c $sql
        Write-Host ""
        Write-Host "User created! You can now login with mobile: $mobile" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Please run this SQL in pgAdmin Query Tool:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "INSERT INTO users (mobile, name, role, status)" -ForegroundColor Cyan
        Write-Host "VALUES ('$mobile', '$name', 'super_admin', 'active');" -ForegroundColor Cyan
        Write-Host ""
    }
    
} elseif ($choice -eq "3") {
    Write-Host ""
    Write-Host "All Super Admin Users:" -ForegroundColor Yellow
    Write-Host ""
    
    if ($psqlAvailable) {
        $env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString | ConvertFrom-SecureString -AsPlainText
        psql -U postgres -d orgit -c "SELECT id, mobile, name, role, status FROM users WHERE role = 'super_admin';"
    } else {
        Write-Host "Please run this SQL in pgAdmin Query Tool:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SELECT id, mobile, name, role, status FROM users WHERE role = 'super_admin';" -ForegroundColor Cyan
        Write-Host ""
    }
    
} else {
    Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure backend server is running (cd backend; npm run dev)" -ForegroundColor White
Write-Host "2. Make sure frontend server is running (cd web; npm run dev)" -ForegroundColor White
Write-Host "3. Open browser: http://localhost:3001" -ForegroundColor White
Write-Host "4. Login with your super admin mobile number" -ForegroundColor White
Write-Host "5. Navigate to: http://localhost:3001/super-admin" -ForegroundColor White
Write-Host ""

