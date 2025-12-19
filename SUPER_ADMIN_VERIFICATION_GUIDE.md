# Super Admin Panel Verification Guide

This guide will help you verify that the Super Admin Panel is working correctly.

## Prerequisites

1. **Database Setup**
   - PostgreSQL database `orgit` must be created
   - All migrations must be run, including:
     - `016_add_super_admin_role.sql`
     - `017_create_document_templates.sql`
     - `018_create_compliance_items.sql`

2. **Backend Server**
   - Backend server must be running on `http://localhost:3000`
   - Environment variables configured in `backend/.env`

3. **Frontend Server**
   - Web app must be running (typically `http://localhost:3001` or `http://localhost:5173`)

## Step 1: Create a Super Admin User

### Option A: Using PostgreSQL directly

```sql
-- Connect to your database
psql -U postgres -d orgit

-- Update an existing user to super_admin role
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE_NUMBER';

-- Or create a new super admin user
INSERT INTO users (mobile, name, role, status)
VALUES ('1234567890', 'Super Admin', 'super_admin', 'active');
```

### Option B: Using pgAdmin

1. Open pgAdmin 4
2. Connect to your PostgreSQL server
3. Navigate to `orgit` database
4. Open Query Tool
5. Run:
```sql
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE_NUMBER';
```

## Step 2: Verify Database Migrations

Run these queries to verify tables exist:

```sql
-- Check super_admin role is allowed
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';

-- Should show: role IN ('admin', 'employee', 'super_admin')

-- Check document_templates table exists
SELECT COUNT(*) FROM document_templates;

-- Check compliance_items table exists
SELECT COUNT(*) FROM compliance_items;
```

## Step 3: Start the Backend Server

```powershell
cd D:\orgit22\backend
npm run dev
```

You should see:
```
Server running on port 3000
Environment: development
```

## Step 4: Start the Frontend Server

```powershell
cd D:\orgit22\web
npm run dev
```

You should see the Vite dev server URL (typically `http://localhost:5173`)

## Step 5: Login as Super Admin

1. Open your browser and navigate to the web app URL
2. Register/Login with the mobile number you set as super_admin
3. Complete the OTP verification and profile setup
4. After login, you should be redirected to `/dashboard`

## Step 6: Access Super Admin Panel

### Method 1: Direct URL
Navigate directly to: `http://localhost:5173/super-admin`

### Method 2: Add Navigation Link (Optional)
You can add a link in your main dashboard for super admin users.

## Step 7: Verify Super Admin Dashboard

1. **Check URL**: Should be `/super-admin`
2. **Check Sidebar**: Should show:
   - Dashboard
   - Organisations
   - Document Management
   - Compliance Management
   - Settings
3. **Check Header**: Should show breadcrumbs and user info
4. **Check Stats Cards**: Should display:
   - Total Organizations
   - Active Organizations
   - Total Users
   - Active Users
   - Total Tasks
   - Active Tasks
   - Completed Tasks
   - Overdue Tasks

## Step 8: Test Organization Management

1. Click "Organisations" in sidebar
2. URL should be `/super-admin/organizations`
3. You should see:
   - List of organizations (if any exist)
   - "Create Organisation" button
   - Search and filter options

### Test Create Organization:
1. Click "Create Organisation"
2. Fill in the form:
   - Name: "Test Organization"
   - Email: "test@example.com"
   - Mobile: "9876543210"
3. Click "Create Organization"
4. Should redirect to organizations list
5. New organization should appear in the list

### Test View Organization:
1. Click on any organization name
2. Should navigate to `/super-admin/organizations/{id}`
3. Should show tabs: Info, Users, Tasks, Stats
4. Check each tab loads correctly

## Step 9: Test Document Template Management

1. Click "Document Management" in sidebar
2. URL should be `/super-admin/document-templates`
3. Should see template list (empty initially)

### Test Create Template:
1. Click "Create Template"
2. Fill in:
   - Template Name: "Test Invoice"
   - Template Type: "Tax Invoice"
   - Body Template: "Invoice #: {{invoice_number}}\nDate: {{invoice_date}}"
3. Click "Create Template"
4. Should redirect to list
5. New template should appear

## Step 10: Test Compliance Management

1. Click "Compliance Management" in sidebar
2. URL should be `/super-admin/compliance`
3. Should see compliance items list (empty initially)

### Test Create Compliance:
1. Click "Add Compliance"
2. Fill in:
   - Name: "GDPR Compliance"
   - Category: "Data Protection"
   - Description: "General Data Protection Regulation requirements"
3. Click "Create Compliance"
4. Should redirect to list
5. New compliance item should appear

## Step 11: Test Task Monitoring

1. Click "Dashboard" in sidebar, then check task monitoring section
2. Or navigate to `/super-admin/tasks` (if route exists)
3. Should see:
   - Platform-level task statistics
   - Organization breakdown
   - Task status distribution

## Step 12: Verify API Endpoints

### Test Backend APIs directly:

```powershell
# Get your auth token first (from browser DevTools > Application > Local Storage)
$token = "YOUR_JWT_TOKEN"

# Test Dashboard API
Invoke-WebRequest -Uri "http://localhost:3000/api/super-admin/dashboard" `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing

# Test Organizations API
Invoke-WebRequest -Uri "http://localhost:3000/api/super-admin/organizations" `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing

# Test Document Templates API
Invoke-WebRequest -Uri "http://localhost:3000/api/super-admin/document-templates" `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing

# Test Compliance API
Invoke-WebRequest -Uri "http://localhost:3000/api/super-admin/compliance" `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

All should return `200 OK` with JSON data.

## Step 13: Test Authorization

### Test Non-Super Admin Access:
1. Login with a regular user (admin or employee role)
2. Try to access `/super-admin`
3. Should redirect to `/dashboard` (access denied)

### Test Super Admin Access:
1. Login with super_admin user
2. Access `/super-admin`
3. Should show Super Admin Panel

## Step 14: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for any errors:
   - API errors
   - React errors
   - Network errors

## Step 15: Verify Database Operations

After creating test data, verify in database:

```sql
-- Check organizations
SELECT * FROM organizations;

-- Check document templates
SELECT * FROM document_templates;

-- Check compliance items
SELECT * FROM compliance_items;

-- Check user role
SELECT id, mobile, name, role FROM users WHERE role = 'super_admin';
```

## Common Issues and Solutions

### Issue 1: "Forbidden: Super admin access required"
**Solution**: Make sure the user's role is set to `'super_admin'` in the database.

### Issue 2: "Route not found"
**Solution**: 
- Check backend server is running
- Verify routes are registered in `backend/src/index.ts`
- Check frontend routes in `web/src/App.tsx`

### Issue 3: "Cannot read property 'role' of undefined"
**Solution**: 
- Check authentication context is working
- Verify JWT token includes user role
- Check `useAuth()` hook returns user data

### Issue 4: Database errors
**Solution**:
- Run all migrations: `016_add_super_admin_role.sql`, `017_create_document_templates.sql`, `018_create_compliance_items.sql`
- Check database connection in `backend/.env`

### Issue 5: Styling issues
**Solution**:
- Check Tailwind config includes super admin colors
- Verify Material Symbols font is loaded
- Check browser console for CSS errors

## Quick Verification Checklist

- [ ] Database migrations run successfully
- [ ] Super admin user created/updated in database
- [ ] Backend server running on port 3000
- [ ] Frontend server running
- [ ] Can login as super admin user
- [ ] Can access `/super-admin` route
- [ ] Dashboard shows statistics
- [ ] Can view organizations list
- [ ] Can create organization
- [ ] Can view organization details
- [ ] Can view document templates list
- [ ] Can create document template
- [ ] Can view compliance list
- [ ] Can create compliance item
- [ ] Task monitoring shows data
- [ ] Non-super admin users cannot access super admin routes
- [ ] No console errors in browser
- [ ] API endpoints return correct data

## Next Steps

Once verified:
1. Test all CRUD operations for each module
2. Test filtering and search functionality
3. Test pagination (if applicable)
4. Test form validation
5. Test error handling
6. Test dark mode toggle
7. Test responsive design

## Support

If you encounter issues:
1. Check backend logs for errors
2. Check browser console for frontend errors
3. Verify database connection
4. Verify all environment variables are set
5. Check that all dependencies are installed (`npm install` in both backend and web directories)

