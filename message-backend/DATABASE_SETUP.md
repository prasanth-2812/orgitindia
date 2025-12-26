# Database Setup Guide

## PostgreSQL Password Authentication Error

If you're seeing `password authentication failed for user "postgres"`, follow these steps:

## Step 1: Create .env File

Create a `.env` file in the `backend` directory with your PostgreSQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=messaging_db
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

**Replace `YOUR_POSTGRES_PASSWORD` with your actual PostgreSQL password.**

## Step 2: Find Your PostgreSQL Password

### If you don't know your PostgreSQL password:

**Windows:**
1. Open **pgAdmin** (PostgreSQL GUI)
2. Right-click on your PostgreSQL server → Properties
3. Check the connection settings

**Or reset the password:**
1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\14\bin`)
3. Run:
```cmd
psql -U postgres
```
4. If it asks for a password and you don't know it, you may need to reset it

**Or check PostgreSQL configuration:**
- Look for `pg_hba.conf` file (usually in `C:\Program Files\PostgreSQL\14\data\`)
- Check if password authentication is enabled

## Step 3: Common PostgreSQL Default Passwords

- **Default during installation**: The password you set during PostgreSQL installation
- **If you forgot**: You may need to reset it or check your installation notes

## Step 4: Test Connection

After creating `.env`, test the connection:

```bash
cd backend
node -e "require('dotenv').config(); const { Pool } = require('pg'); const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD }); pool.query('SELECT NOW()', (err, res) => { if (err) console.error('Error:', err.message); else console.log('Connected!', res.rows[0]); process.exit(0); });"
```

## Step 5: Create Database (if not exists)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE messaging_db;

# Exit
\q
```

## Step 6: Run Database Schema

```bash
cd backend
psql -U postgres -d messaging_db -f database/schema.sql
```

## Troubleshooting

### If password still doesn't work:

1. **Reset PostgreSQL password:**
   - Edit `pg_hba.conf` to use `trust` authentication temporarily
   - Connect without password
   - Change password: `ALTER USER postgres WITH PASSWORD 'newpassword';`
   - Change `pg_hba.conf` back to `md5` or `scram-sha-256`

2. **Use a different user:**
   - Create a new PostgreSQL user:
   ```sql
   CREATE USER messaging_user WITH PASSWORD 'your_password';
   CREATE DATABASE messaging_db OWNER messaging_user;
   GRANT ALL PRIVILEGES ON DATABASE messaging_db TO messaging_user;
   ```
   - Update `.env` with the new user credentials

3. **Check PostgreSQL is running:**
   ```bash
   # Windows
   services.msc
   # Look for "postgresql-x64-14" service
   ```

## Quick Fix Template

Create `backend/.env` file with this template and fill in your password:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=messaging_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change-this-to-a-random-string-in-production
NODE_ENV=development
```

**Important:** Make sure `.env` is in `.gitignore` (it should be) so you don't commit your password!

