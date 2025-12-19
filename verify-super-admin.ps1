# Super Admin Panel Verification Script
# This script helps verify the Super Admin Panel setup

Write-Host "=== Super Admin Panel Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend server is running
Write-Host "1. Checking backend server..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "   [OK] Backend server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "   [FAIL] Backend server is not running" -ForegroundColor Red
    Write-Host "   Please start it with: cd backend; npm run dev" -ForegroundColor Yellow
    exit 1
}

# Check database connection (requires psql)
Write-Host ""
Write-Host "2. Checking database migrations..." -ForegroundColor Yellow
Write-Host "   Please verify manually:" -ForegroundColor Yellow
Write-Host "   - Run migration 016_add_super_admin_role.sql" -ForegroundColor White
Write-Host "   - Run migration 017_create_document_templates.sql" -ForegroundColor White
Write-Host "   - Run migration 018_create_compliance_items.sql" -ForegroundColor White

# Check if super admin user exists
Write-Host ""
Write-Host "3. Super Admin User Setup:" -ForegroundColor Yellow
Write-Host "   To create/update a super admin user, run this SQL:" -ForegroundColor White
Write-Host ""
Write-Host "   UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE_NUMBER';" -ForegroundColor Cyan
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   INSERT INTO users (mobile, name, role, status)" -ForegroundColor Cyan
Write-Host "   VALUES ('1234567890', 'Super Admin', 'super_admin', 'active');" -ForegroundColor Cyan
Write-Host ""

# Test API endpoints (requires authentication token)
Write-Host "4. API Endpoint Tests:" -ForegroundColor Yellow
Write-Host "   To test APIs, you need:" -ForegroundColor White
Write-Host "   - A valid JWT token from login" -ForegroundColor White
Write-Host "   - Run these commands with your token:" -ForegroundColor White
Write-Host ""
Write-Host '   $token = "YOUR_JWT_TOKEN"' -ForegroundColor Cyan
Write-Host '   Invoke-WebRequest -Uri "http://localhost:3000/api/super-admin/dashboard" -Headers @{"Authorization"="Bearer $token"}' -ForegroundColor Cyan
Write-Host ""

# Frontend check
Write-Host "5. Frontend Setup:" -ForegroundColor Yellow
Write-Host "   - Make sure web server is running (npm run dev in web/)" -ForegroundColor White
Write-Host "   - Check which port your frontend is running on (check terminal output)" -ForegroundColor White
Write-Host "   - Navigate to: http://localhost:PORT/super-admin" -ForegroundColor White
Write-Host "     (Common ports: 3001, 5173, or check your vite.config.ts)" -ForegroundColor Gray
Write-Host "   - Login with your super admin user" -ForegroundColor White
Write-Host ""

# Try to detect frontend port
Write-Host "   Checking common frontend ports..." -ForegroundColor Yellow
$frontendPorts = @(3001, 5173, 3000)
$frontendFound = $false
foreach ($port in $frontendPorts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "   [OK] Frontend detected on port $port" -ForegroundColor Green
            Write-Host "   Navigate to: http://localhost:$port/super-admin" -ForegroundColor Cyan
            $frontendFound = $true
            break
        }
    } catch {
        # Port not active, continue checking
    }
}
if (-not $frontendFound) {
    Write-Host "   [INFO] Frontend server not detected on common ports" -ForegroundColor Yellow
    Write-Host "   Please check your terminal for the actual port number" -ForegroundColor White
}
Write-Host ""

# Verification checklist
Write-Host "6. Verification Checklist:" -ForegroundColor Yellow
Write-Host "   [ ] Database migrations run" -ForegroundColor White
Write-Host "   [ ] Super admin user created" -ForegroundColor White
Write-Host "   [ ] Backend server running" -ForegroundColor White
Write-Host "   [ ] Frontend server running" -ForegroundColor White
Write-Host "   [ ] Can access /super-admin route" -ForegroundColor White
Write-Host "   [ ] Dashboard shows statistics" -ForegroundColor White
Write-Host "   [ ] Can create/view organizations" -ForegroundColor White
Write-Host "   [ ] Can create/view document templates" -ForegroundColor White
Write-Host "   [ ] Can create/view compliance items" -ForegroundColor White
Write-Host ""

Write-Host "For detailed instructions, see: SUPER_ADMIN_VERIFICATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
