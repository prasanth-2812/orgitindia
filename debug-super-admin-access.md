# Debug Super Admin Access Issues

## Common Issues and Solutions

### Issue 1: Page Not Loading / Blank Screen

**Check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors

**Possible causes:**
- Frontend server not running
- JavaScript errors
- Route not matching

### Issue 2: Redirects to /dashboard

**This means:** User role is not `'super_admin'`

**Check:**
1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage
3. Check if `token` exists
4. Go to Console tab and run:
   ```javascript
   // Check current user
   fetch('http://localhost:3000/api/auth/me', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('token')
     }
   }).then(r => r.json()).then(console.log)
   ```

**Solution:**
- Make sure user role in database is exactly `'super_admin'` (case-sensitive)
- Verify with SQL: `SELECT mobile, name, role FROM users WHERE mobile = 'YOUR_MOBILE';`

### Issue 3: Redirects to /register

**This means:** User is not authenticated

**Check:**
- Is there a token in localStorage?
- Is the token expired?
- Try logging in again

### Issue 4: 404 Not Found

**This means:** Route doesn't exist or frontend server issue

**Check:**
- Is frontend server running on port 3001?
- Check browser Network tab for failed requests
- Verify route exists in `web/src/App.tsx`

## Step-by-Step Debugging

### Step 1: Check Frontend Server
```powershell
# Check if port 3001 is in use
netstat -ano | findstr :3001
```

### Step 2: Check User Role in Database
```sql
SELECT id, mobile, name, role, status 
FROM users 
WHERE mobile = 'YOUR_MOBILE_NUMBER';
```

Should show: `role = 'super_admin'`

### Step 3: Check Browser Console
1. Open `http://localhost:3001`
2. Press F12
3. Go to Console tab
4. Look for errors

### Step 4: Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to `/super-admin`
4. Check if API calls are made
5. Check response status codes

### Step 5: Check Local Storage
1. Open DevTools (F12)
2. Go to Application tab
3. Click Local Storage → `http://localhost:3001`
4. Check for `token` key
5. If exists, copy the token value

### Step 6: Test API Directly
```powershell
$token = "YOUR_TOKEN_FROM_LOCALSTORAGE"
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
```

Should return user object with `role: "super_admin"`

## Quick Fixes

### Fix 1: Update User Role
```sql
UPDATE users SET role = 'super_admin' WHERE mobile = 'YOUR_MOBILE';
```

### Fix 2: Clear Browser Cache
1. Press Ctrl+Shift+Delete
2. Clear cache and cookies
3. Reload page

### Fix 3: Check Frontend Server
```powershell
cd D:\orgit22\web
npm run dev
```

Should show: `Local: http://localhost:3001`

### Fix 4: Restart Backend
```powershell
cd D:\orgit22\backend
npm run dev
```

## Expected Behavior

When accessing `http://localhost:3001/super-admin`:

1. **If not logged in:** Redirects to `/register`
2. **If logged in but not super_admin:** Redirects to `/dashboard`
3. **If logged in as super_admin:** Shows Super Admin Dashboard

## Verify Everything Works

1. ✅ Frontend server running on port 3001
2. ✅ Backend server running on port 3000
3. ✅ User exists in database with `role = 'super_admin'`
4. ✅ User is logged in (token in localStorage)
5. ✅ User object has `role: 'super_admin'`
6. ✅ No console errors
7. ✅ Route `/super-admin` exists in App.tsx

