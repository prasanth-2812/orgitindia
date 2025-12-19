# Troubleshooting Super Admin Panel Not Opening

## Quick Diagnostic Steps

### Step 1: Test Route Access

Try accessing the test route first:
```
http://localhost:3001/super-admin-test
```

This will show you:
- If you're authenticated
- What your user role is
- If the route is accessible

### Step 2: Check Browser Console

1. Open `http://localhost:3001` in your browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try navigating to `/super-admin`
5. **Look for any red error messages**

Common errors you might see:
- `Cannot read property 'role' of null` - User not loaded
- `Route not found` - Routing issue
- `Module not found` - Import error
- `TypeError` - JavaScript error

### Step 3: Check Network Tab

1. In DevTools, go to **Network** tab
2. Navigate to `/super-admin`
3. Check if any requests fail (red status codes)
4. Check if `/api/auth/me` is called and what it returns

### Step 4: Verify User Role

Run this in browser console (F12 → Console):
```javascript
// Check current user
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('User data:', data);
  console.log('Role:', data.data?.role);
  if (data.data?.role !== 'super_admin') {
    console.error('❌ User role is not super_admin!');
    console.log('Current role:', data.data?.role);
  } else {
    console.log('✅ User is super_admin');
  }
});
```

### Step 5: Check Local Storage

1. In DevTools, go to **Application** tab
2. Click **Local Storage** → `http://localhost:3001`
3. Check if `token` exists
4. If no token: You need to login first

## Common Issues and Fixes

### Issue 1: Blank Page / Nothing Happens

**Possible causes:**
- JavaScript error preventing render
- Route not matching
- Component import error

**Fix:**
1. Check browser console for errors
2. Check if frontend server is running
3. Try the test route: `/super-admin-test`

### Issue 2: Redirects to /register

**Cause:** Not authenticated

**Fix:**
1. Login first at `http://localhost:3001/register`
2. Complete OTP verification
3. Then navigate to `/super-admin`

### Issue 3: Redirects to /dashboard

**Cause:** User role is not `'super_admin'`

**Fix:**
1. Update user role in database:
   ```sql
   UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE';
   ```
2. Logout and login again
3. Try `/super-admin` again

### Issue 4: 404 Not Found

**Cause:** Route doesn't exist or frontend server issue

**Fix:**
1. Check if frontend server is running
2. Verify route exists in `web/src/App.tsx`
3. Restart frontend server

### Issue 5: "Cannot read property 'role' of null"

**Cause:** User object not loaded yet

**Fix:**
- Wait for authentication to complete
- Check if token is valid
- Check if `/api/auth/me` returns user data

## Step-by-Step Debugging

### 1. First, test the test route:
```
http://localhost:3001/super-admin-test
```

This will show you exactly what's wrong.

### 2. Check what happens:
- **If test route works:** The issue is with the SuperAdminProtectedRoute or Dashboard component
- **If test route doesn't work:** The issue is with routing or server

### 3. Check authentication:
```javascript
// In browser console
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user') || 'null'));
```

### 4. Check user role in database:
```sql
SELECT mobile, name, role FROM users WHERE mobile = 'YOUR_MOBILE';
```

Should show: `role = 'super_admin'`

## Quick Fixes

### Fix 1: Clear Browser Cache
1. Press **Ctrl+Shift+Delete**
2. Clear cache and cookies
3. Reload page

### Fix 2: Restart Frontend Server
```powershell
# Stop current server (Ctrl+C)
cd D:\orgit22\web
npm run dev
```

### Fix 3: Update User Role
```sql
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE';
```

Then logout and login again.

### Fix 4: Check for JavaScript Errors
1. Open DevTools (F12)
2. Console tab
3. Look for red errors
4. Share the error message

## What to Share for Help

If still not working, share:
1. **Browser console errors** (F12 → Console)
2. **What happens** when you navigate to `/super-admin`:
   - Blank page?
   - Redirects where?
   - Error message?
3. **User role** from database query
4. **Network tab** - any failed requests?

