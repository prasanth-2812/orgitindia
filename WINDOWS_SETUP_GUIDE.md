# ORGIT Windows Setup Guide

This guide is specifically for Windows users and addresses common setup issues.

## Step 1: Verify Prerequisites

### Check Node.js and npm

```powershell
node --version
npm --version
```

**If not installed:**
- Download from: https://nodejs.org/
- Install Node.js (includes npm)

### Check PostgreSQL Installation

**Option A: Using pgAdmin (GUI - Recommended for Windows)**

1. Open **pgAdmin 4** (should be installed with PostgreSQL)
2. If not installed, download from: https://www.postgresql.org/download/windows/
3. Install PostgreSQL with pgAdmin

**Option B: Find PostgreSQL Installation Path**

PostgreSQL is usually installed at:
- `C:\Program Files\PostgreSQL\XX\bin\` (where XX is version number)

To add to PATH temporarily in current session:

```powershell
# Find your PostgreSQL version folder
$pgPath = "C:\Program Files\PostgreSQL\17\bin"  # Change 15 to your version
$env:Path += ";$pgPath"

# Verify
psql --version
```

**To add permanently:**

1. Open System Properties → Environment Variables
2. Edit "Path" variable
3. Add: `C:\Program Files\PostgreSQL\15\bin` (replace 15 with your version)
4. Restart PowerShell

---

## Step 2: Install Dependencies

### 2.1 Install Root Dependencies

```powershell
# Navigate to project
cd D:\orgit22

# Install root dependencies
npm install
```

### 2.2 Install Backend Dependencies

```powershell
cd backend
npm install
cd ..
```

### 2.3 Install Web Dependencies

```powershell
cd web
npm install
cd ..
```

### 2.4 Install Shared Dependencies

```powershell
cd shared
npm install
cd ..
```

---

## Step 3: Set Up PostgreSQL Database

### 3.1 Method A: Using pgAdmin (Easiest)

1. **Open pgAdmin 4**
2. **Connect to PostgreSQL Server:**
   - Right-click "Servers" → "Create" → "Server"
   - Name: `PostgreSQL` (or any name)
   - Connection tab:
     - Host: `localhost`
     - Port: `5432`
     - Username: `postgres`
     - Password: (your PostgreSQL password)
   - Click "Save"

3. **Create Database:**
   - Right-click "Databases" → "Create" → "Database"
   - Database name: `orgit`
   - Click "Save"

4. **Run Migrations:**
   - Right-click on `orgit` database → "Query Tool"
   - Open each migration file from `database\migrations\` folder
   - Run them in order (001, 002, 003, etc.)

### 3.2 Method B: Using PowerShell Script (If psql is in PATH)

```powershell
# Make sure PostgreSQL is in PATH first (see Step 1)
powershell -ExecutionPolicy Bypass -File run-migrations.ps1
```

### 3.3 Method C: Manual SQL Execution via pgAdmin

1. Open pgAdmin → Query Tool on `orgit` database
2. Copy contents of each migration file
3. Paste and execute in order

**Migration files order:**
1. `001_create_organizations.sql`
2. `002_create_users.sql`
3. `003_create_user_organizations.sql`
4. `004_create_sessions.sql`
5. `005_create_contacts.sql`
6. `006_create_groups.sql`
7. `007_create_group_members.sql`
8. `008_create_messages.sql`
9. `009_create_message_status.sql`
10. `010_create_tasks.sql`
11. `011_create_task_assignments.sql`
12. `012_create_task_status_logs.sql`
13. `013_create_notifications.sql`
14. `014_create_otp_verifications.sql`
15. `015_add_foreign_key_task_id_to_groups.sql`

---

## Step 4: Configure Environment Variables

### 4.1 Create Backend .env File

```powershell
cd D:\orgit22\backend

# Create .env file
@"
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

# JWT Configuration
JWT_SECRET=orgit-super-secret-jwt-key-change-in-production-min-32-chars-long
JWT_EXPIRES_IN=7d

# OTP Service (Development - OTP logged to console)
OTP_SERVICE_PROVIDER=twilio
OTP_SERVICE_ACCOUNT_SID=dev
OTP_SERVICE_AUTH_TOKEN=dev
OTP_SERVICE_PHONE_NUMBER=dev
OTP_EXPIRY_MINUTES=3
OTP_MAX_ATTEMPTS=3

# AWS S3 (Optional - can leave as is for basic testing)
AWS_ACCESS_KEY_ID=dev
AWS_SECRET_ACCESS_KEY=dev
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=orgit-uploads

# Socket.io Configuration
SOCKET_CORS_ORIGIN=http://localhost:3001,http://localhost:19006

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/mpeg,audio/wav
"@ | Out-File -FilePath .env -Encoding utf8
```

**Important:** Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password.

### 4.2 Create Web .env File

```powershell
cd D:\orgit22\web

# Create .env file
@"
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8
```

---

## Step 5: Verify Database Connection

### 5.1 Test Connection with pgAdmin

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Expand `orgit` database
4. Expand "Schemas" → "public" → "Tables"
5. You should see all tables listed

### 5.2 Verify Tables Created

In pgAdmin Query Tool, run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 14 tables.

---

## Step 6: Start Backend Server

### 6.1 Open New PowerShell Window

```powershell
cd D:\orgit22\backend
npm run dev
```

**Expected Output:**
```
Server running on port 3000
Environment: development
Task scheduled jobs initialized
```

**If you see errors:**
- Check `.env` file exists and has correct database password
- Verify PostgreSQL service is running (Services → postgresql-x64-XX)
- Check port 3000 is not in use

### 6.2 Test Backend Health

Open **another PowerShell window**:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri http://localhost:3000/health | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{"status":"ok","timestamp":"..."}
```

### 6.3 Test OTP Endpoint

```powershell
# Test OTP request
$body = @{ mobile = "1234567890" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/auth/request-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body $body | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{"success":true,"message":"OTP sent successfully","otpCode":"123456"}
```

**Note:** Check the backend console window for the actual OTP code.

---

## Step 7: Start Web Frontend

### 7.1 Open New PowerShell Window

```powershell
cd D:\orgit22\web
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
```

### 7.2 Open Browser

Open your web browser and navigate to:

```
http://localhost:3001
```

You should see the **Mobile Number Registration** screen.

---

## Step 8: Test Authentication Flow

### 8.1 Register New User

1. **Enter Mobile Number:**
   - Type: `1234567890` (or any 10 digits)
   - Click "Get OTP"

2. **Get OTP from Backend Console:**
   - Look at the backend PowerShell window
   - You'll see: `OTP for 1234567890: 123456`
   - Copy the 6-digit code

3. **Verify OTP:**
   - Enter the OTP code
   - Click "Verify"
   - You'll be redirected to profile setup

4. **Complete Profile:**
   - Enter your name (required)
   - Optionally add bio
   - Toggle contact sync if desired
   - Click "Save & Continue"

5. **Dashboard:**
   - You should see the dashboard with task overview

---

## Step 9: Verify Database Data

### 9.1 Check User Created (pgAdmin)

In pgAdmin Query Tool:

```sql
SELECT id, mobile, name, role, status FROM users;
```

### 9.2 Check Session Created

```sql
SELECT user_id, device_id, is_active FROM sessions;
```

---

## Step 10: Test Core Features

### 10.1 Dashboard Features

- [ ] Task statistics cards display (Overdue, Due Soon, In Progress, Completed)
- [ ] Toggle between "Self Tasks" and "Assigned Tasks"
- [ ] Click to expand "Document Management" section
- [ ] Click to expand "Compliance Management" section
- [ ] Bottom navigation works

### 10.2 Messaging Features

1. Click "Chat" in bottom navigation
2. Verify chat list screen loads
3. Try creating a new chat (if feature available)

### 10.3 Task Features

1. Click "+" floating button on dashboard
2. Or navigate to Tasks section
3. Try creating a new task

---

## Step 11: Test Real-time (Socket.io)

### 11.1 Open Multiple Browser Windows

1. Open `http://localhost:3001` in Chrome
2. Open `http://localhost:3001` in Edge (or incognito)
3. Register two different users
4. Start messaging between them
5. Verify real-time message delivery

### 11.2 Check Browser Console

Press `F12` in browser → Console tab
- Should see Socket.io connection messages
- No red errors

---

## Step 12: Mobile App (Android Studio)

### 12.1 Install Expo CLI

```powershell
npm install -g expo-cli
```

### 12.2 Start Mobile App

```powershell
cd D:\orgit22\mobile
npm install
npm start
```

### 12.3 Run on Android Emulator

1. **Open Android Studio**
2. **Start AVD (Android Virtual Device):**
   - Tools → Device Manager
   - Create/Start an emulator

3. **In Expo Terminal:**
   - Press `a` to open on Android
   - Or scan QR code with Expo Go app on phone

### 12.4 Alternative: Use Physical Device

1. Install **Expo Go** app from Play Store
2. Scan QR code from Expo terminal
3. App will load on your phone

---

## Troubleshooting

### PostgreSQL Not Found

**Solution 1: Add to PATH**
```powershell
# Find PostgreSQL installation
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory

# Add to PATH for current session
$pgVersion = "15"  # Change to your version
$pgPath = "C:\Program Files\PostgreSQL\$pgVersion\bin"
$env:Path += ";$pgPath"
```

**Solution 2: Use Full Path**
```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE orgit;"
```

**Solution 3: Use pgAdmin (Easiest)**
- Use pgAdmin GUI instead of command line

### Port Already in Use

**Check what's using port 3000:**
```powershell
netstat -ano | findstr :3000
```

**Kill process:**
```powershell
# Find PID from above command, then:
taskkill /PID <PID> /F
```

### Database Connection Error

**Check PostgreSQL Service:**
1. Open Services (`services.msc`)
2. Find `postgresql-x64-XX` service
3. Ensure it's "Running"
4. If not, right-click → Start

**Verify Credentials:**
- Check `backend/.env` file
- Ensure password matches PostgreSQL installation password

### Migration Errors

**Drop and Recreate Database (pgAdmin):**
1. Right-click `orgit` database → Delete/Drop
2. Create new database named `orgit`
3. Re-run migrations

---

## Quick Verification Commands

```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check if backend is running
Invoke-WebRequest http://localhost:3000/health

# Check if web is running
Invoke-WebRequest http://localhost:3001

# Check PostgreSQL service
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

---

## Success Checklist

- [ ] Backend server starts on port 3000
- [ ] Web app loads on port 3001
- [ ] Database `orgit` created
- [ ] All 14 tables exist
- [ ] Can register with mobile number
- [ ] OTP appears in backend console
- [ ] Can complete profile setup
- [ ] Dashboard displays correctly
- [ ] Navigation works
- [ ] No console errors in browser

---

## Next Steps After Verification

1. Create test users
2. Create test tasks
3. Test messaging between users
4. Test task assignment and acceptance
5. Explore all features

---

## Need Help?

- Check backend console for errors
- Check browser console (F12) for frontend errors
- Verify all `.env` files are configured
- Ensure PostgreSQL service is running
- Check that ports 3000 and 3001 are available

