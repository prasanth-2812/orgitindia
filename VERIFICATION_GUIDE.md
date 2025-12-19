# ORGIT Verification Guide - Step by Step

This guide will help you verify the complete ORGIT application setup, including backend, web frontend, and database.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js >= 18.0.0 installed
- [ ] npm >= 9.0.0 installed
- [ ] PostgreSQL >= 14.0 installed and running
- [ ] PostgreSQL database created
- [ ] Code editor (VS Code recommended)
- [ ] Web browser (Chrome/Firefox/Edge)
- [ ] Android Studio (for mobile app - optional)

---

## Step 1: Verify Prerequisites

### Check Node.js and npm versions:

```bash
node --version
# Should show v18.0.0 or higher

npm --version
# Should show 9.0.0 or higher
```

### Check PostgreSQL:

```bash
# On Windows (PowerShell)
psql --version

# Or check if PostgreSQL service is running
# Open Services (services.msc) and look for "postgresql-x64-XX"
```

---

## Step 2: Set Up PostgreSQL Database

### 2.1 Create Database

Open PostgreSQL command line or pgAdmin:

```bash
# Using psql command line
psql -U postgres
```

Then run:

```sql
CREATE DATABASE orgit;
\q
```

### 2.2 Verify Database Created

```bash
psql -U postgres -l
# Look for 'orgit' in the list
```

---

## Step 3: Install Dependencies

### 3.1 Install Root Dependencies

```bash
# Navigate to project root
cd D:\orgit22

# Install root dependencies
npm install
```

### 3.2 Install Backend Dependencies

```bash
cd backend
npm install
```

### 3.3 Install Web Dependencies

```bash
cd ../web
npm install
```

### 3.4 Install Shared Dependencies

```bash
cd ../shared
npm install
```

---

## Step 4: Configure Environment Variables

### 4.1 Backend Environment Setup

```bash
# Navigate to backend directory
cd D:\orgit22\backend

# Create .env file (copy from .env.example if it exists, or create new)
# On Windows PowerShell:
New-Item -Path .env -ItemType File
```

Edit `backend/.env` with the following content:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# OTP Service Configuration (For development, OTP will be logged to console)
OTP_SERVICE_PROVIDER=twilio
OTP_SERVICE_ACCOUNT_SID=your-twilio-account-sid
OTP_SERVICE_AUTH_TOKEN=your-twilio-auth-token
OTP_SERVICE_PHONE_NUMBER=your-twilio-phone-number
OTP_EXPIRY_MINUTES=3
OTP_MAX_ATTEMPTS=3

# AWS S3 Configuration (Optional for basic testing)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=orgit-uploads

# Socket.io Configuration
SOCKET_CORS_ORIGIN=http://localhost:3001,http://localhost:19006

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/mpeg,audio/wav
```

**Important:** Replace `your_postgres_password` with your actual PostgreSQL password.

### 4.2 Web Environment Setup

```bash
# Navigate to web directory
cd D:\orgit22\web

# Create .env file
New-Item -Path .env -ItemType File
```

Edit `web/.env` with:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Step 5: Run Database Migrations

### 5.1 Manual Migration (Recommended for first setup)

Since we're using SQL migration files, you can run them manually:

```bash
# Connect to PostgreSQL
psql -U postgres -d orgit
```

Then run each migration file in order:

```sql
-- Run migration 001
\i D:/orgit22/database/migrations/001_create_organizations.sql

-- Run migration 002
\i D:/orgit22/database/migrations/002_create_users.sql

-- Continue for all 15 migration files...
```

**Or use a script to run all migrations:**

Create a file `run-migrations.ps1` in the root directory:

```powershell
# run-migrations.ps1
$migrations = Get-ChildItem -Path "database\migrations\*.sql" | Sort-Object Name
$dbName = "orgit"
$dbUser = "postgres"

foreach ($migration in $migrations) {
    Write-Host "Running $($migration.Name)..."
    psql -U $dbUser -d $dbName -f $migration.FullName
}
```

Run it:

```bash
powershell -ExecutionPolicy Bypass -File run-migrations.ps1
```

### 5.2 Verify Tables Created

```bash
psql -U postgres -d orgit -c "\dt"
```

You should see tables:
- organizations
- users
- user_organizations
- sessions
- contacts
- groups
- group_members
- messages
- message_status
- tasks
- task_assignments
- task_status_logs
- notifications
- otp_verifications

---

## Step 6: Start Backend Server

### 6.1 Start Backend

Open a new terminal/PowerShell window:

```bash
cd D:\orgit22\backend
npm run dev
```

**Expected Output:**
```
Server running on port 3000
Environment: development
Task scheduled jobs initialized
```

### 6.2 Test Backend Health

Open another terminal and test:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Or use PowerShell:
Invoke-WebRequest -Uri http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2024-01-XX..."}
```

### 6.3 Test API Endpoint

```bash
# Test OTP request endpoint
curl -X POST http://localhost:3000/api/auth/request-otp -H "Content-Type: application/json" -d "{\"mobile\":\"1234567890\"}"

# Or PowerShell:
Invoke-WebRequest -Uri http://localhost:3000/api/auth/request-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"mobile":"1234567890"}'
```

**Expected Response:**
```json
{"success":true,"message":"OTP sent successfully","otpCode":"123456"}
```

**Note:** In development mode, OTP is logged to console. Check the backend terminal for the OTP code.

---

## Step 7: Start Web Frontend

### 7.1 Start Web Development Server

Open a **new terminal/PowerShell window**:

```bash
cd D:\orgit22\web
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
```

### 7.2 Open in Browser

Open your web browser and navigate to:

```
http://localhost:3001
```

You should see the **Mobile Number Registration** screen.

---

## Step 8: Test Authentication Flow

### 8.1 Test Registration

1. **Enter Mobile Number:**
   - Enter a 10-digit mobile number (e.g., `1234567890`)
   - Click "Get OTP"

2. **Check Backend Console:**
   - Look for: `OTP for 1234567890: XXXXXX`
   - Copy the 6-digit OTP

3. **Verify OTP:**
   - You'll be redirected to OTP verification screen
   - Enter the 6-digit OTP from console
   - Click "Verify"

4. **Complete Profile:**
   - Enter your name
   - Optionally add bio
   - Toggle contact sync if desired
   - Click "Save & Continue"

5. **Dashboard:**
   - You should be redirected to the dashboard
   - You'll see task overview and sections

---

## Step 9: Test Core Features

### 9.1 Test Dashboard

- [ ] Verify task statistics cards display
- [ ] Toggle between "Self Tasks" and "Assigned Tasks"
- [ ] Expand/collapse "Document Management" section
- [ ] Expand/collapse "Compliance Management" section
- [ ] Click on a task card (if tasks exist)

### 9.2 Test Messaging

1. Navigate to Messages (bottom nav)
2. Verify chat list displays
3. Click on a chat to open conversation
4. Send a test message
5. Verify real-time message delivery

### 9.3 Test Task Creation

1. Click the "+" floating button on dashboard
2. Or navigate to Tasks → Create Task
3. Fill in task details:
   - Title: "Test Task"
   - Description: "This is a test task"
   - Select "One-Time Task" or "Recurring Task"
   - Set dates
   - Select assignees
4. Click "Save"
5. Verify task appears in dashboard

### 9.4 Test Task Management

1. Navigate to Tasks section
2. View task list
3. Click on a task to view details
4. Test Accept/Reject functionality
5. Test Complete task functionality

---

## Step 10: Verify Database Operations

### 10.1 Check User Created

```bash
psql -U postgres -d orgit -c "SELECT id, mobile, name, role FROM users;"
```

### 10.2 Check Session Created

```bash
psql -U postgres -d orgit -c "SELECT user_id, device_id, is_active FROM sessions;"
```

### 10.3 Check Tasks Created

```bash
psql -U postgres -d orgit -c "SELECT id, title, status FROM tasks;"
```

---

## Step 11: Test Real-time Features (Socket.io)

### 11.1 Open Multiple Browser Windows

1. Open `http://localhost:3001` in Chrome
2. Open `http://localhost:3001` in Firefox (or incognito)
3. Register two different users
4. Start a chat between them
5. Send messages and verify real-time delivery

### 11.2 Check Socket Connection

In browser console (F12), you should see:
- Socket connection established
- Message events being received

---

## Step 12: Mobile App Setup (Optional)

### 12.1 Install Expo CLI

```bash
npm install -g expo-cli
```

### 12.2 Start Mobile App

```bash
cd D:\orgit22\mobile
npm install
npm start
```

### 12.3 Run on Android Emulator

1. Open Android Studio
2. Start an Android Virtual Device (AVD)
3. In the Expo terminal, press `a` to open on Android
4. Or scan QR code with Expo Go app on physical device

---

## Troubleshooting

### Backend Issues

**Problem:** Database connection error
```bash
# Solution: Check PostgreSQL is running and credentials are correct
# Verify in backend/.env file
```

**Problem:** Port 3000 already in use
```bash
# Solution: Change PORT in backend/.env or kill process using port 3000
# Windows: netstat -ano | findstr :3000
# Then: taskkill /PID <PID> /F
```

**Problem:** Migration errors
```bash
# Solution: Drop and recreate database
psql -U postgres -c "DROP DATABASE orgit;"
psql -U postgres -c "CREATE DATABASE orgit;"
# Then re-run migrations
```

### Web Frontend Issues

**Problem:** CORS errors
```bash
# Solution: Ensure backend/.env has correct SOCKET_CORS_ORIGIN
SOCKET_CORS_ORIGIN=http://localhost:3001
```

**Problem:** API connection failed
```bash
# Solution: Check backend is running on port 3000
# Verify web/.env has correct VITE_API_URL
```

**Problem:** Tailwind styles not applying
```bash
# Solution: Rebuild CSS
cd web
npm run dev
# Or check tailwind.config.js is correct
```

### Database Issues

**Problem:** Tables not found
```bash
# Solution: Run migrations manually
psql -U postgres -d orgit -f database/migrations/001_create_organizations.sql
# Continue for all files...
```

---

## Quick Verification Checklist

- [ ] Backend server starts without errors
- [ ] Database connection successful
- [ ] All tables created
- [ ] Web frontend loads at http://localhost:3001
- [ ] Registration screen displays correctly
- [ ] OTP verification works
- [ ] Profile creation works
- [ ] Dashboard displays
- [ ] Navigation works
- [ ] API calls succeed (check Network tab in browser DevTools)
- [ ] Socket.io connection established
- [ ] Real-time messaging works

---

## Next Steps

1. **Create Test Data:**
   - Create multiple users
   - Create tasks
   - Create groups
   - Send messages

2. **Test All Features:**
   - Task creation and assignment
   - Task acceptance/rejection
   - Message sending and receiving
   - Group creation
   - Task mentions

3. **Monitor Logs:**
   - Backend console for API calls
   - Browser console for frontend errors
   - Network tab for API requests

---

## Support

If you encounter issues:

1. Check backend console for errors
2. Check browser console (F12) for frontend errors
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL is running
5. Check that ports 3000 and 3001 are available

---

## Success Indicators

✅ Backend running on port 3000  
✅ Web app running on port 3001  
✅ Database connected and tables created  
✅ Can register new user  
✅ Can complete authentication flow  
✅ Dashboard displays correctly  
✅ Navigation works  
✅ API endpoints respond correctly  

