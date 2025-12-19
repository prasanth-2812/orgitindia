# Quick diagnostic script to check Super Admin access

Write-Host "=== Super Admin Access Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check frontend server
Write-Host "1. Checking frontend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 2
    Write-Host "   [OK] Frontend server is running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Frontend server not running on port 3001" -ForegroundColor Red
    Write-Host "   Start it with: cd web; npm run dev" -ForegroundColor Yellow
}

# Check backend server
Write-Host ""
Write-Host "2. Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2
    Write-Host "   [OK] Backend server is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Backend server not running on port 3000" -ForegroundColor Red
    Write-Host "   Start it with: cd backend; npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Next Steps:" -ForegroundColor Yellow
Write-Host "   a) Open browser: http://localhost:3001" -ForegroundColor White
Write-Host "   b) Press F12 to open DevTools" -ForegroundColor White
Write-Host "   c) Go to Console tab and check for errors" -ForegroundColor White
Write-Host "   d) Try navigating to: http://localhost:3001/super-admin" -ForegroundColor White
Write-Host "   e) Check Application tab > Local Storage for 'token'" -ForegroundColor White
Write-Host ""

Write-Host "4. Common Issues:" -ForegroundColor Yellow
Write-Host "   - If redirects to /register: Not logged in" -ForegroundColor White
Write-Host "   - If redirects to /dashboard: User role is not 'super_admin'" -ForegroundColor White
Write-Host "   - If blank page: Check browser console for errors" -ForegroundColor White
Write-Host "   - If 404: Frontend server might not be running" -ForegroundColor White
Write-Host ""

Write-Host "5. Verify User Role in Database:" -ForegroundColor Yellow
Write-Host "   Run this SQL in pgAdmin:" -ForegroundColor White
Write-Host "   SELECT mobile, name, role FROM users WHERE role = 'super_admin';" -ForegroundColor Cyan
Write-Host ""

