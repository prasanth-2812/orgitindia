# ORGIT Quick Start Guide

## Fastest Way to Get Started

### 1. Install Dependencies (One Command)

```bash
# From project root
npm install && cd backend && npm install && cd ../web && npm install && cd ../shared && npm install && cd ..
```

### 2. Set Up Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE orgit;"

# Run migrations (Windows PowerShell)
powershell -ExecutionPolicy Bypass -File run-migrations.ps1
```

### 3. Configure Environment

**Backend (.env):**
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key-min-32-characters-long
```

**Web (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

### 5. Open Browser

Navigate to: **http://localhost:3001**

### 6. Test Registration

1. Enter mobile: `1234567890`
2. Click "Get OTP"
3. Check backend console for OTP (e.g., `OTP for 1234567890: 123456`)
4. Enter OTP and verify
5. Complete profile
6. You're in! 🎉

---

## Common Commands

```bash
# Install all dependencies
npm run install:all

# Start backend only
npm run dev:backend

# Start web only
npm run dev:web

# Run backend tests
cd backend && npm test

# Check database tables
psql -U postgres -d orgit -c "\dt"
```

---

## Verification Checklist

- [ ] Backend: http://localhost:3000/health returns `{"status":"ok"}`
- [ ] Web: http://localhost:3001 loads registration screen
- [ ] Can register with mobile number
- [ ] OTP appears in backend console
- [ ] Can complete profile setup
- [ ] Dashboard displays after login

---

## Need Help?

See `VERIFICATION_GUIDE.md` for detailed step-by-step instructions.

