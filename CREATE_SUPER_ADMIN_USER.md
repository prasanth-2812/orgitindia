# How to Create a Super Admin User

There are several ways to create a super admin user. Choose the method that works best for you.

## Method 1: Update Existing User (Recommended)

If you already have a user account, you can simply update their role to `super_admin`.

### Using pgAdmin:

1. Open pgAdmin 4
2. Connect to your PostgreSQL server
3. Navigate to: `Servers` → `PostgreSQL` → `Databases` → `orgit`
4. Right-click on `orgit` → `Query Tool`
5. Run this SQL:

```sql
-- Replace 'YOUR_MOBILE_NUMBER' with your actual mobile number
UPDATE users 
SET role = 'super_admin' 
WHERE mobile = 'YOUR_MOBILE_NUMBER';
```

6. Click the Execute button (or press F5)
7. You should see: `UPDATE 1` if successful

### Using psql Command Line:

```powershell
# Connect to database
psql -U postgres -d orgit

# Run the update command
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE_NUMBER';

# Exit psql
\q
```

## Method 2: Create New Super Admin User

If you want to create a completely new super admin user:

### Using pgAdmin:

1. Open Query Tool in pgAdmin (same as above)
2. Run this SQL:

```sql
INSERT INTO users (mobile, name, role, status)
VALUES ('1234567890', 'Super Admin', 'super_admin', 'active');
```

**Important**: Replace `'1234567890'` with a valid mobile number you can use for login.

### Using psql:

```powershell
psql -U postgres -d orgit

INSERT INTO users (mobile, name, role, status)
VALUES ('1234567890', 'Super Admin', 'super_admin', 'active');
```

## Method 3: Using PowerShell Script

I'll create a simple PowerShell script to help you create a super admin user.

## Verification

After creating/updating the user, verify it worked:

```sql
-- Check if user is now super_admin
SELECT id, mobile, name, role, status 
FROM users 
WHERE role = 'super_admin';
```

You should see your user with `role = 'super_admin'`.

## Login Steps

1. **Start the frontend server** (if not running):
   ```powershell
   cd D:\orgit22\web
   npm run dev
   ```

2. **Open browser**: Navigate to `http://localhost:3001`

3. **Register/Login**:
   - Enter the mobile number you set as super_admin
   - Complete OTP verification
   - Complete profile setup (if first time)

4. **Access Super Admin Panel**:
   - Navigate to: `http://localhost:3001/super-admin`
   - You should see the Super Admin dashboard

## Troubleshooting

### Issue: "Forbidden: Super admin access required"
- **Solution**: Make sure the user's role is exactly `'super_admin'` (case-sensitive)
- Verify with: `SELECT role FROM users WHERE mobile = 'YOUR_MOBILE';`

### Issue: User doesn't exist
- **Solution**: First register the user through the app, then update their role
- Or create a new user using Method 2

### Issue: Can't connect to database
- **Solution**: Make sure PostgreSQL is running
- Check connection settings in `backend/.env`

## Quick Reference

**Most Common Method** (Update existing user):
```sql
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE_NUMBER';
```

**Create New User**:
```sql
INSERT INTO users (mobile, name, role, status)
VALUES ('1234567890', 'Super Admin', 'super_admin', 'active');
```

**Verify User**:
```sql
SELECT * FROM users WHERE role = 'super_admin';
```

