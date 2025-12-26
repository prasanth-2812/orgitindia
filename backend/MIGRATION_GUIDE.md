# Migration Guide: Enhanced Features

## Step 1: Update Database Schema

Run the enhanced schema in pgAdmin 4 or via command line:

```bash
psql -U postgres -d messaging_db -f database/schema_enhanced.sql
```

**Important**: This adds new tables but doesn't break existing ones. Your current data will be preserved.

## Step 2: Choose Server Version

You have two options:

### Option A: Use Enhanced Server (Recommended)
Update `server.js` to use enhanced routes, or use `server_enhanced.js`:

```bash
# Rename current server
mv server.js server_old.js

# Use enhanced server
mv server_enhanced.js server.js

# Restart server
npm start
```

### Option B: Keep Both Versions
Run enhanced server on different port:
```bash
node server_enhanced.js
# Runs on port 3000 (or PORT env var)
```

## Step 3: Test Enhanced Features

### Test OTP Authentication:
```bash
# Generate OTP
curl -X POST http://localhost:3000/api/auth/generate-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890"}'

# Verify OTP (use OTP from response)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","otp":"123456"}'
```

### Test Contact Syncing:
```bash
curl -X POST http://localhost:3000/api/contacts/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"name": "John Doe", "phone": "9876543210"},
      {"name": "Jane Smith", "phone": "9876543211"}
    ]
  }'
```

### Test Group Creation:
```bash
curl -X POST http://localhost:3000/api/conversations/groups/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Group",
    "memberIds": ["user-id-1", "user-id-2"]
  }'
```

## Step 4: Update Mobile App

The mobile app needs updates to support:
1. OTP authentication flow
2. Contact syncing
3. Media message handling
4. Group management UI
5. Message reactions UI
6. Search functionality

See `ENHANCED_FEATURES.md` for API details.

## Backward Compatibility

- Old authentication (`/api/auth/register`, `/api/auth/login`) still works
- Old message endpoints still work
- Old conversation endpoints still work
- You can gradually migrate to new endpoints

## Rollback

If you need to rollback:
1. Use `server_old.js` (or original `server.js`)
2. Old schema still works (new tables are optional)
3. No data loss

## Next Steps

1. ✅ Database schema updated
2. ✅ Backend routes created
3. ✅ Socket.IO handlers enhanced
4. ⏳ Update mobile app (see mobile app TODO)
5. ⏳ Add media upload handling (S3/Cloudinary)
6. ⏳ Implement notifications endpoint
7. ⏳ Connect task module integration

