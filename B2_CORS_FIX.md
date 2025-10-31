# Fix B2 CORS Slow Preflight Issue

## Problem

Your uploads are working but the CORS preflight request takes **16.19 seconds**, causing timeouts and slow uploads.

## Root Cause

B2's CORS preflight is slow when not optimally configured. The preflight happens before every chunk upload, so with 10MB chunks, a 100MB file has 10 preflights = 160+ seconds of wasted time!

## Solution: Optimize CORS Configuration

Update your B2 CORS rules with these optimized settings:

### Via Backblaze Web Interface

1. Go to https://secure.backblaze.com
2. Buckets → Your Bucket → Bucket Settings → CORS Rules
3. **Delete existing CORS rule**
4. **Add new optimized rule:**

```json
{
  "corsRuleName": "directUploads",
  "allowedOrigins": [
    "https://yarrowweddings.com",
    "https://www.yarrowweddings.com",
    "http://localhost:3000"
  ],
  "allowedOperations": [
    "s3_put"
  ],
  "allowedHeaders": [
    "content-type",
    "x-amz-*"
  ],
  "exposeHeaders": [
    "etag"
  ],
  "maxAgeSeconds": 86400
}
```

### Key Changes:

1. **`maxAgeSeconds: 86400`** (24 hours instead of 1 hour)
   - Browser caches preflight for 24 hours
   - Eliminates repeated slow preflights
   
2. **Specific `allowedHeaders`** instead of `"*"`
   - Faster preflight processing
   - Only allows what's needed

3. **Lowercase `"etag"`** in exposeHeaders
   - Some browsers are case-sensitive

4. **Only `s3_put`** operation
   - Minimal permissions = faster processing

### Via B2 CLI

```bash
# Create optimized CORS file
cat > cors-optimized.json << 'EOF'
[
  {
    "corsRuleName": "directUploads",
    "allowedOrigins": [
      "https://yarrowweddings.com",
      "https://www.yarrowweddings.com",
      "http://localhost:3000"
    ],
    "allowedOperations": [
      "s3_put"
    ],
    "allowedHeaders": [
      "content-type",
      "x-amz-*"
    ],
    "exposeHeaders": [
      "etag"
    ],
    "maxAgeSeconds": 86400
  }
]
EOF

# Apply (replace <bucketName> with your actual bucket name)
b2 update-bucket --corsRules "$(cat cors-optimized.json)" <bucketName> allPublic
```

## After Updating CORS

### 1. Clear Browser Cache
```
Ctrl+Shift+Delete → Clear cached images and files
```

### 2. Hard Refresh
```
Ctrl+F5 or Cmd+Shift+R
```

### 3. Test Upload
- Upload 3 photos
- Check Network tab
- Preflight should now be < 1 second
- Subsequent uploads should skip preflight (cached for 24 hours)

## Expected Results

### Before Optimization:
```
Preflight: 16.19s (SLOW!)
Upload chunk 1: 35.41s
Preflight: 16.19s (SLOW!)
Upload chunk 2: 35.41s
...
Total for 100MB file: ~500+ seconds
```

### After Optimization:
```
Preflight: 0.5s (first time only)
Upload chunk 1: 35.41s
Upload chunk 2: 35.41s (no preflight - cached!)
Upload chunk 3: 35.41s (no preflight - cached!)
...
Total for 100MB file: ~350 seconds (30% faster!)
```

## Additional Optimizations

### 1. Reduce Chunk Size (If Still Slow)

If 35 seconds per chunk is too slow, reduce chunk size:

Edit `backend/src/config/uploadConfig.ts`:
```typescript
CHUNK_SIZE: 5 * 1024 * 1024,  // 5MB instead of 10MB
```

Edit `frontend/src/config/uploadConfig.ts`:
```typescript
CHUNK_SIZE: 5 * 1024 * 1024,  // 5MB instead of 10MB
```

**Trade-off:**
- Smaller chunks = more chunks = more API calls
- But each chunk uploads faster
- Better for slow connections

### 2. Increase Timeout (Already Done)

The code now has a 5-minute timeout per chunk, which should be sufficient.

### 3. Enable Compression

Users can enable "Compress before upload" checkbox in UI to reduce file size before uploading.

## Verification

### Check CORS is Working:

```javascript
// In browser console
fetch('https://s3.us-west-004.backblazeb2.com/', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://yarrowweddings.com',
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'content-type'
  }
}).then(r => {
  console.log('CORS Status:', r.status);
  console.log('Cache Control:', r.headers.get('access-control-max-age'));
  return r.headers;
}).then(headers => {
  for (let [key, value] of headers.entries()) {
    if (key.startsWith('access-control')) {
      console.log(key + ':', value);
    }
  }
});
```

Should show:
```
CORS Status: 200
Cache Control: 86400
access-control-allow-origin: https://yarrowweddings.com
access-control-allow-methods: PUT
access-control-max-age: 86400
```

## Troubleshooting

### Preflight Still Slow After Update

1. **Wait 5 minutes** for B2 to propagate changes
2. **Clear browser cache completely**
3. **Try incognito/private window**
4. **Check B2 dashboard** - verify CORS rule is saved

### Uploads Still Failing

1. Check browser console for specific error
2. Verify ETag is in response headers
3. Test with small file (< 1MB) first
4. Check backend logs: `docker-compose logs backend -f`

### 500 Errors on Backend

The 500 errors on `/multipart/parts` and `/multipart/abort` are likely because:
- Upload ID doesn't exist (already aborted)
- Key doesn't match
- B2 API error

Check backend logs for specific error message.

## Summary

**Main fix:** Update CORS `maxAgeSeconds` to 86400 (24 hours)

This will:
- ✅ Eliminate slow preflight on subsequent chunks
- ✅ Speed up uploads by ~30%
- ✅ Reduce B2 API calls
- ✅ Improve user experience

Deploy the updated `uploadUtils.ts` and update B2 CORS, then test uploads.
