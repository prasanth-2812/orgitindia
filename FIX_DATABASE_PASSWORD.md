# Fix Database Password Authentication Error

## Problem
Error: `password authentication failed for user "postgres"`

This means the password in `backend/.env` doesn't match your PostgreSQL password.

## Solution

### Step 1: Find Your Correct PostgreSQL Password

You know the password because you used it to connect via psql. Use that same password.

### Step 2: Update backend/.env File

**Option A: Edit the file manually**

1. Open `D:\orgit22\backend\.env` in a text editor
2. Find the line: `DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE`
3. Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password
4. Save the file

**Option B: Recreate the file with PowerShell**

```powershell
cd D:\orgit22\backend

# Get password securely
$pgPassword = Read-Host "Enter your PostgreSQL password" -AsSecureString
$pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))

# Create .env file with correct password
@"
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=$pgPasswordPlain

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
"@ | Out-File -FilePath .env -Encoding utf8 -Force
```

### Step 3: Restart Backend Server

1. **Stop the current backend server** (Press `Ctrl+C` in the backend terminal)
2. **Restart it:**

```powershell
cd D:\orgit22\backend
npm run dev
```

### Step 4: Test Connection

Try the OTP request again from the web app, or test directly:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri http://localhost:3000/health

# Test OTP endpoint
$body = @{ mobile = "1234567890" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/auth/request-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
```

## Common Issues

### Issue: Still getting password error after update

**Solutions:**

1. **Verify password is correct:**
   - Try connecting with psql using the same password
   - `psql -U postgres -d orgit`
   - If psql works but backend doesn't, check for:
     - Extra spaces in .env file
     - Special characters that need escaping
     - Wrong password copied

2. **Check .env file format:**
   - No quotes around password value
   - No spaces before/after `=`
   - Correct format: `DB_PASSWORD=yourpassword`

3. **Restart backend:**
   - Make sure backend server was restarted after .env change
   - Environment variables are loaded on startup

### Issue: Forgot PostgreSQL Password

**Reset password:**

1. **Using pgAdmin:**
   - Right-click PostgreSQL server → Properties
   - Change password in Connection tab

2. **Using psql:**
   ```sql
   ALTER USER postgres WITH PASSWORD 'newpassword';
   ```

3. **Then update backend/.env with new password**

## Verification

After fixing, you should see:
- Backend starts without database errors
- Health endpoint works: `http://localhost:3000/health`
- OTP request succeeds
- No "password authentication failed" errors in console

