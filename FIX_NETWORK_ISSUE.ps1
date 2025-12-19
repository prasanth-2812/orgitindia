# Script to fix npm network issues
# Run this before attempting npm install again

Write-Host "Fixing npm network configuration..." -ForegroundColor Yellow

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# Set registry to official npm registry
Write-Host "Setting npm registry..." -ForegroundColor Cyan
npm config set registry https://registry.npmjs.org/

# Increase timeout settings
Write-Host "Increasing timeout settings..." -ForegroundColor Cyan
npm config set fetch-timeout 120000
npm config set fetch-retries 10

# Disable strict SSL (if behind corporate proxy)
$useProxy = Read-Host "Are you behind a corporate proxy? (y/n)"
if ($useProxy -eq "y") {
    $proxyUrl = Read-Host "Enter proxy URL (e.g., http://proxy.company.com:8080)"
    npm config set proxy $proxyUrl
    npm config set https-proxy $proxyUrl
    npm config set strict-ssl false
    Write-Host "Proxy configured" -ForegroundColor Green
} else {
    # Remove proxy if set
    npm config delete proxy
    npm config delete https-proxy
    npm config set strict-ssl true
    Write-Host "Proxy removed" -ForegroundColor Green
}

# Verify configuration
Write-Host "`nCurrent npm configuration:" -ForegroundColor Yellow
Write-Host "Registry: $(npm config get registry)" -ForegroundColor Cyan
Write-Host "Timeout: $(npm config get fetch-timeout)" -ForegroundColor Cyan
Write-Host "Retries: $(npm config get fetch-retries)" -ForegroundColor Cyan

Write-Host "`n✓ Network configuration updated!" -ForegroundColor Green
Write-Host "`nNow try installing again:" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor White
Write-Host "  Or: npm install --legacy-peer-deps" -ForegroundColor White

