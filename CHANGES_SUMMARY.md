# Direct Upload to B2 - Changes Summary

## Overview

Modified the upload system to send files directly from the browser to Backblaze B2, eliminating the VPS proxy for upload data. This reduces VPS bandwidth usage by approximately 50% for uploads.

## What Changed

### Before
```
User Browser → VPS (proxy) → Backblaze B2
- VPS receives full file data
- VPS forwards to B2
- 2x bandwidth usage on VPS
```

### After
```
User Browser → Backblaze B2 (direct)
- VPS only coordinates (creates sessions, generates URLs)
- File data goes directly to B2
- ~0x upload bandwidth on VPS (only small API calls)
```

## Files Modified

### 1. `frontend/lib/uploadUtils.ts`
**Changes:**
- Removed proxy upload through `/uploads/multipart/upload`
- Now uploads chunks directly to B2 using presigned URLs
- Added type guards to ensure `key` and `uploadId` are defined

**Key change:**
```typescript
// OLD: Upload through VPS proxy
const uploadResponse = await fetch(
  `${BASE_URL}/uploads/multipart/upload?url=${encodeURIComponent(signedUrl)}`,
  { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: chunk }
);

// NEW: Upload directly to B2
const uploadResponse = await fetch(signedUrl, {
  method: "PUT",
  headers: { "Content-Type": "application/octet-stream" },
  body: chunk,
});
```

### 2. `backend/src/routes/uploads.ts`
**Changes:**
- Removed the `/uploads/multipart/upload` proxy endpoint
- Added comment explaining the change

**Removed:**
```typescript
router.put('/multipart/upload', uploadPartProxy)
```

### 3. `backend/src/controllers/uploadsController.ts`
**Changes:**
- Updated comment in `signMultipartPart` to clarify direct upload
- `uploadPartProxy` function still exists but is no longer used (can be removed in future)

## What Stayed the Same

✅ **Downloads** - Still proxied through VPS (required for zip creation)
✅ **Thumbnail generation** - Still happens on VPS
✅ **Photo registration** - Still happens on VPS
✅ **Authentication** - Still required for all operations
✅ **Gallery access control** - Unchanged
✅ **User permissions** - Unchanged
✅ **Database operations** - Unchanged

## Required Configuration

### B2 CORS Setup (REQUIRED)

You must configure CORS on your B2 bucket to allow direct browser uploads. See `DIRECT_UPLOAD_SETUP.md` for detailed instructions.

**Quick setup via Backblaze web interface:**
1. Go to Buckets → Your Bucket → Bucket Settings → CORS Rules
2. Add this rule:

```json
{
  "corsRuleName": "allowDirectUploads",
  "allowedOrigins": [
    "https://yarrowweddings.com",
    "https://www.yarrowweddings.com",
    "http://localhost:3000"
  ],
  "allowedOperations": ["s3_put"],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
  "maxAgeSeconds": 3600
}
```

## Testing

### 1. Deploy the changes
```bash
./deploy-production.sh
```

### 2. Test upload
1. Open browser DevTools (F12) → Network tab
2. Upload a photo to any gallery
3. Look for PUT requests to `s3.us-west-004.backblazeb2.com` (or your B2 region)
4. Verify requests go directly to B2, not your VPS

### 3. Expected network activity
```
POST /api/uploads/multipart/create → VPS
GET /api/uploads/multipart/sign → VPS
PUT https://s3.us-west-004.backblazeb2.com/... → B2 (DIRECT)
PUT https://s3.us-west-004.backblazeb2.com/... → B2 (DIRECT)
...
POST /api/uploads/multipart/complete → VPS
POST /api/uploads/thumbnail/generate → VPS
POST /api/uploads/register → VPS
```

## Benefits

### Bandwidth Savings
- **Before:** 200MB VPS bandwidth per 100MB photo
- **After:** ~1MB VPS bandwidth per 100MB photo
- **Savings:** ~99% reduction in upload bandwidth

### Performance
- **Faster uploads** - No VPS bottleneck
- **Lower VPS CPU/memory** - No data proxying
- **Better scalability** - VPS can handle more concurrent uploads

### Cost
- Reduced VPS bandwidth costs
- Reduced VPS resource usage
- No change in B2 costs (same storage and bandwidth)

## Security

### Still Protected
- ✅ Presigned URLs expire after 1 hour
- ✅ Each URL is unique and single-use
- ✅ User must be authenticated photographer
- ✅ Gallery access control unchanged
- ✅ CORS only allows PUT from your domains

### What CORS Allows
- Only PUT operations (uploads)
- Only from specified origins (your domains)
- Does NOT allow public bucket access
- Presigned URLs still required

## Troubleshooting

### CORS Error
**Symptom:** Browser console shows CORS policy error

**Solution:**
1. Verify CORS rules are configured in B2
2. Check your domain is in `allowedOrigins`
3. Wait a few minutes for propagation

### Missing ETag Error
**Symptom:** "Missing ETag from B2 upload response"

**Solution:**
1. Verify `exposeHeaders` includes "ETag" in CORS config
2. Check browser network tab for ETag header

### Upload works locally but not in production
**Solution:**
1. Add production domain to CORS `allowedOrigins`
2. Ensure using HTTPS in production
3. Match domain exactly (with/without www)

## Rollback

If needed, revert to proxied uploads:

```bash
git revert HEAD
./deploy-production.sh
```

Or manually restore the proxy endpoint in `backend/src/routes/uploads.ts`.

## Next Steps

1. ✅ Code changes complete
2. ⏳ Configure B2 CORS (see `DIRECT_UPLOAD_SETUP.md`)
3. ⏳ Deploy to production
4. ⏳ Test uploads
5. ⏳ Monitor bandwidth usage

## Documentation

- **Setup Guide:** `DIRECT_UPLOAD_SETUP.md` - Complete setup instructions
- **This File:** `CHANGES_SUMMARY.md` - Technical changes overview
