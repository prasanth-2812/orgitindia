# Test Backend Connection
Write-Host "Testing backend connection..." -ForegroundColor Yellow

# Test 1: Health check
try {
    $response = Invoke-WebRequest -Uri http://localhost:3000/health
    Write-Host "✓ Health check passed" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}

# Test 2: OTP request
Write-Host "
Testing OTP request..." -ForegroundColor Yellow
try {
    $body = @{ mobile = "1234567890" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri http://localhost:3000/api/auth/request-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "✓ OTP request successful" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "✗ OTP request failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}
