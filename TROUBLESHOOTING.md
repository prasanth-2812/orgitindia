# ORGIT Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: npm Network Error (ECONNRESET)

**Error Message:**
```
npm error network read ECONNRESET
npm error network This is a problem related to network connectivity.
```

**Solutions:**

#### Solution 1: Retry Installation

```powershell
# Clear npm cache
npm cache clean --force

# Retry installation
npm install
```

#### Solution 2: Use Different Registry

```powershell
# Use npm registry directly
npm install --registry https://registry.npmjs.org/

# Or set registry globally
npm config set registry https://registry.npmjs.org/
```

#### Solution 3: Increase Timeout

```powershell
# Increase npm timeout
npm config set fetch-timeout 60000
npm config set fetch-retries 5

# Then retry
npm install
```

#### Solution 4: Install Dependencies One by One

Instead of installing all at once, install each module separately:

```powershell
# Root
cd D:\orgit22
npm install

# Backend (if root succeeds)
cd backend
npm install

# Web (if backend succeeds)
cd ..\web
npm install

# Shared (if web succeeds)
cd ..\shared
npm install
```

#### Solution 5: Use Yarn (Alternative Package Manager)

```powershell
# Install Yarn globally
npm install -g yarn

# Then use Yarn instead
cd D:\orgit22
yarn install

cd backend
yarn install

cd ..\web
yarn install

cd ..\shared
yarn install
```

#### Solution 6: Check Proxy Settings

If you're behind a corporate proxy:

```powershell
# Check current proxy settings
npm config get proxy
npm config get https-proxy

# Set proxy if needed
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Or remove proxy if not needed
npm config delete proxy
npm config delete https-proxy
```

#### Solution 7: Use VPN or Different Network

- Try using a different network connection
- Disable VPN if enabled
- Enable VPN if you're behind a firewall

---

### Issue 2: PostgreSQL Not Found

**Error:** `psql : The term 'psql' is not recognized`

**Solution:** Use pgAdmin instead (see WINDOWS_SETUP_GUIDE.md)

---

### Issue 3: Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual PID from above)
taskkill /PID <PID> /F

# Or change port in backend/.env
# PORT=3001
```

---

### Issue 4: Database Connection Error

**Error:** `Connection refused` or `password authentication failed`

**Solutions:**

1. **Check PostgreSQL Service:**
   ```powershell
   # Check if PostgreSQL service is running
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   
   # Start service if stopped
   Start-Service postgresql-x64-15  # Change version number
   ```

2. **Verify Credentials:**
   - Check `backend/.env` file
   - Ensure password matches PostgreSQL installation password
   - Default username is usually `postgres`

3. **Test Connection:**
   - Open pgAdmin
   - Try connecting with same credentials
   - If pgAdmin works, credentials are correct

---

### Issue 5: Module Not Found Errors

**Error:** `Cannot find module 'xxx'`

**Solution:**

```powershell
# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

---

### Issue 6: Permission Errors (EPERM)

**Error:** `EPERM: operation not permitted`

**Solutions:**

1. **Run PowerShell as Administrator:**
   - Right-click PowerShell → "Run as Administrator"
   - Then run npm install

2. **Close All Node Processes:**
   ```powershell
   # Kill all node processes
   taskkill /F /IM node.exe
   
   # Then retry installation
   ```

3. **Check File Permissions:**
   - Right-click project folder → Properties → Security
   - Ensure you have full control

---

### Issue 7: TypeScript Errors

**Error:** TypeScript compilation errors

**Solution:**

```powershell
# Rebuild TypeScript
cd backend
npm run build

# Or for web
cd web
npm run build
```

---

### Issue 8: Tailwind CSS Not Working

**Error:** Styles not applying

**Solution:**

```powershell
cd web

# Rebuild
npm run dev

# Check tailwind.config.js exists
# Check postcss.config.js exists
# Check index.css imports Tailwind
```

---

## Step-by-Step Recovery Process

If installation fails completely:

### 1. Clean Everything

```powershell
cd D:\orgit22

# Remove all node_modules
Get-ChildItem -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force

# Remove all package-lock.json files
Get-ChildItem -Recurse -Filter "package-lock.json" | Remove-Item -Force

# Clear npm cache
npm cache clean --force
```

### 2. Reinstall Step by Step

```powershell
# Step 1: Root
cd D:\orgit22
npm install --legacy-peer-deps

# Step 2: Backend (wait for root to complete)
cd backend
npm install --legacy-peer-deps

# Step 3: Web
cd ..\web
npm install --legacy-peer-deps

# Step 4: Shared
cd ..\shared
npm install --legacy-peer-deps
```

### 3. Alternative: Use --legacy-peer-deps Flag

This flag helps with dependency conflicts:

```powershell
npm install --legacy-peer-deps
```

---

## Network-Specific Solutions

### Slow Internet Connection

```powershell
# Increase timeout
npm config set fetch-timeout 120000
npm config set fetch-retries 10

# Use single-threaded installation
npm install --prefer-offline --no-audit
```

### Corporate Firewall

```powershell
# Configure npm to use corporate proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
npm config set strict-ssl false

# Then install
npm install
```

---

## Verification After Fix

After resolving issues, verify:

```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Test backend can start
cd backend
npm run dev
# (Press Ctrl+C to stop)

# Test web can start
cd ..\web
npm run dev
# (Press Ctrl+C to stop)
```

---

## Getting Help

If issues persist:

1. Check error logs:
   - `C:\Users\<YourUser>\AppData\Local\npm-cache\_logs\`

2. Check backend console for specific errors

3. Check browser console (F12) for frontend errors

4. Verify all environment variables are set correctly

5. Ensure PostgreSQL service is running

---

## Quick Fix Commands Summary

```powershell
# Fix network issues
npm cache clean --force
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 60000

# Fix permission issues
# Run PowerShell as Administrator

# Fix module issues
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps

# Fix port issues
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

