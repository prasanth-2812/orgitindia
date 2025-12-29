# Database Setup Guide

## Quick Fix for Authentication Error

If you're getting `password authentication failed for user "postgres"`, follow these steps:

### Step 1: Create `.env` file

Create a `.env` file in the `backend` directory with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password
```

**Important:** Replace `your_actual_postgres_password` with your actual PostgreSQL password.

### Step 2: Find Your PostgreSQL Password

If you don't know your PostgreSQL password, try one of these:

#### Option A: Check if you have a saved password
- Check your PostgreSQL installation notes
- Look for password in pgAdmin saved connections
- Check if you set it during PostgreSQL installation

#### Option B: Reset PostgreSQL Password (Windows)

1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\<version>\bin`)
3. Run:
   ```cmd
   pg_ctl -D "C:\Program Files\PostgreSQL\<version>\data" -l logfile start
   ```
4. Connect without password:
   ```cmd
   psql -U postgres
   ```
5. If that doesn't work, edit `pg_hba.conf`:
   - Location: `C:\Program Files\PostgreSQL\<version>\data\pg_hba.conf`
   - Change `md5` to `trust` for local connections
   - Restart PostgreSQL service
   - Connect and change password:
     ```sql
     ALTER USER postgres PASSWORD 'newpassword';
     ```
   - Change `trust` back to `md5` in pg_hba.conf
   - Restart PostgreSQL service

#### Option C: Use pgAdmin
1. Open pgAdmin
2. Right-click on your PostgreSQL server
3. Select "Properties"
4. Go to "Connection" tab to see/change password

### Step 3: Create Database

Once you can connect, create the database:

```sql
CREATE DATABASE orgit;
```

### Step 4: Run Schema Script

Execute the schema script:

```bash
# Using psql
psql -U postgres -d orgit -f database/schema-production.sql

# Or in pgAdmin Query Tool
# 1. Connect to 'orgit' database
# 2. Open Query Tool
# 3. Copy and paste contents of database/schema-production.sql
# 4. Execute
```

### Step 5: Verify Connection

Test your connection by running the backend:

```bash
cd backend
npm run dev
```

If you still get authentication errors, double-check your `.env` file has the correct password.

## Alternative: Use Different Database User

If you prefer to create a dedicated user for the application:

```sql
-- Create new user
CREATE USER orgit_user WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE orgit TO orgit_user;

-- Connect to orgit database
\c orgit

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO orgit_user;
```

Then update your `.env`:
```env
DB_USER=orgit_user
DB_PASSWORD=secure_password_here
```

## Troubleshooting

### Error: "database 'orgit' does not exist"
- Create the database first: `CREATE DATABASE orgit;`

### Error: "relation does not exist"
- Run the schema script: `database/schema-production.sql`

### Error: "password authentication failed"
- Check your `.env` file has correct password
- Verify PostgreSQL service is running
- Check `pg_hba.conf` allows your connection method

### Error: "connection refused"
- Ensure PostgreSQL service is running
- Check `DB_HOST` and `DB_PORT` in `.env`
- Verify firewall isn't blocking the connection

