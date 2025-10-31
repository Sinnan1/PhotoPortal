# Upload Troubleshooting Guide

## Current Issue: Slow Uploads & Failures

You're experiencing:
- Only 1 upload succeeding out of 3
- Very slow upload speed
- Remaining uploads failing

## Root Cause: Missing CORS Configuration

**The direct upload changes require CORS to be configured on your B2 bucket.** Without CORS, the browser blocks direct uploads to B2.

### How to Diagnose

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Try uploading a photo**
4. **Look for CORS errors:**

```
Access to fetch at 'https://s3.us-west-004.backblazeb2.com/...' 
from origin 'https://yarrowweddings.com' has been blocked by CORS policy
```

If you see this error, CORS is not configured.

## Solution: Configure B2 CORS

### Option 1: Backblaze Web Interface (Easiest)

1. Go to https://secure.backblaze.com
2. Click **Buckets** → Select your bucket
3. Click **Bucket Settings**
4. Scroll to **CORS Rules**
5. Click **Add CORS Rule**
6. Paste this configuration:

```json
{
  "corsRuleName": "allowDirectUploads",
  "allowedOrigins": [
    "https://yarrowweddings.com",
    "https://www.yarrowweddings.com",
    "http://localhost:3000"
  ],
  "allowedOperations": [
    "s3_put"
  ],
  "allowedHeaders": [
    "*"
  ],
  "exposeHeaders": [
    "ETag",
    "x-amz-request-id",
    "x-amz-id-2"
  ],
  "maxAgeSeconds": 3600
}
```

7. Click **Save**
8. **Wait 2-3 minutes** for changes to propagate

### Option 2: Using B2 CLI

```bash
# Install B2 CLI
pip install b2

# Authorize
b2 authorize-account <applicationKeyId> <applicationKey>

# Create CORS rules file
cat > cors-rules.json << 'EOF'
[
  {
    "corsRuleName": "allowDirectUploads",
    "allowedOrigins": [
      "https://yarrowweddings.com",
      "https://www.yarrowweddings.com",
      "http://localhost:3000"
    ],
    "allowedOperations": [
      "s3_put"
    ],
    "allowedHeaders": [
      "*"
    ],
    "exposeHeaders": [
      "ETag",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS rules (replace <bucketName> with your actual bucket name)
b2 update-bucket --corsRules "$(cat cors-rules.json)" <bucketName> allPublic
```

### Option 3: Using AWS CLI with B2

```bash
# Configure AWS CLI for B2
aws configure --profile b2
# Enter your B2 application key ID as Access Key
# Enter your B2 application key as Secret Key
# Enter your region (e.g., us-west-004)

# Create CORS configuration
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://yarrowweddings.com",
        "https://www.yarrowweddings.com",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS (replace values with your actual bucket and region)
aws s3api put-bucket-cors \
  --bucket <your-bucket-name> \
  --cors-configuration file://cors.json \
  --endpoint-url https://s3.us-west-004.backblazeb2.com \
  --profile b2
```

## After Configuring CORS

### 1. Wait 2-3 Minutes
CORS changes take a moment to propagate.

### 2. Test Upload
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh the page
3. Try uploading 3 photos
4. Check browser console - should see no CORS errors
5. All 3 should upload successfully

### 3. Verify in Network Tab
1. Open DevTools → Network tab
2. Upload a photo
3. Look for PUT requests to `s3.us-west-004.backblazeb2.com`
4. Check response status: should be **200 OK**
5. Check response headers: should include **ETag**

## Other Potential Issues

### Issue 1: Slow Upload Speed

**Symptoms:**
- Uploads are very slow even without errors
- Progress bar moves slowly

**Causes:**
- User's internet upload speed is slow
- VPS is still proxying (CORS not working)
- Large file sizes

**Solutions:**
1. Check if CORS is working (see above)
2. Enable compression before upload (checkbox in UI)
3. Check user's internet speed: https://fast.com

### Issue 2: Only 1 Upload at a Time

**Current Setting:**
```typescript
private maxConcurrent = 3  // In upload-manager.ts
```

This means only 3 files upload simultaneously. This is intentional to:
- Prevent overwhelming the browser
- Ensure stable uploads
- Avoid B2 rate limits

**To increase concurrency:**
Edit `frontend/lib/upload-manager.ts`:
```typescript
private maxConcurrent = 5  // Or higher
```

**Note:** Higher concurrency may cause:
- Browser memory issues
- Network congestion
- More failed uploads

### Issue 3: Uploads Failing After Success

**Symptoms:**
- First upload succeeds
- Subsequent uploads fail

**Cause:**
- CORS preflight cache expired
- Token expired
- Network issue

**Solution:**
1. Verify CORS `maxAgeSeconds` is set to 3600
2. Check auth token expiration
3. Retry failed uploads (button in UI)

### Issue 4: "Missing ETag" Error

**Symptoms:**
```
Error: Missing ETag from B2 upload response
```

**Cause:**
CORS `exposeHeaders` doesn't include "ETag"

**Solution:**
Add "ETag" to `exposeHeaders` in CORS config:
```json
"exposeHeaders": [
  "ETag",
  "x-amz-request-id",
  "x-amz-id-2"
]
```

## Temporary Workaround: Revert to Proxied Uploads

If you need uploads working immediately while configuring CORS:

### 1. Restore Proxy Endpoint

Edit `backend/src/routes/uploads.ts`:
```typescript
// Add back the proxy endpoint
const CHUNK_UPLOAD_LIMIT = `${Math.ceil(UPLOAD_CONFIG.CHUNK_SIZE / (1024 * 1024))}mb`
router.put(
  '/multipart/upload',
  express.raw({ type: '*/*', limit: CHUNK_UPLOAD_LIMIT }),
  uploadRateLimit,
  authenticateToken,
  requireRole('PHOTOGRAPHER'),
  uploadPartProxy
)
```

### 2. Update Frontend

Edit `frontend/lib/uploadUtils.ts`:
```typescript
// Change direct upload back to proxy
const uploadResponse = await fetch(
  `${BASE_URL}/uploads/multipart/upload?url=${encodeURIComponent(signedUrl)}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    credentials: "include",
    body: chunk,
  }
);
```

### 3. Deploy
```bash
./deploy-production.sh
```

This will restore the old proxied upload system while you configure CORS.

## Monitoring Upload Performance

### Check Upload Speed
```bash
# On VPS - monitor bandwidth
vnstat -l

# Should see minimal upload bandwidth if direct uploads are working
# Should see high upload bandwidth if still proxying
```

### Check Browser Console
```javascript
// In browser console, check upload progress
localStorage.getItem('upload-batches')
```

### Check B2 Logs
In Backblaze dashboard:
- Go to Buckets → Your Bucket → Logs
- Look for PUT requests
- Check for 403 errors (CORS issue)
- Check for 200 success

## Expected Behavior After CORS Setup

### Successful Upload Flow:
1. User selects 3 photos
2. Browser shows "Uploading 3 photos"
3. All 3 start uploading (up to maxConcurrent at once)
4. Progress bars move smoothly
5. All complete successfully
6. Thumbnails generate
7. Photos appear in gallery

### Network Activity:
```
POST /api/uploads/multipart/create → VPS (fast)
GET /api/uploads/multipart/sign → VPS (fast)
PUT https://s3...backblazeb2.com/... → B2 DIRECT (slow - actual upload)
PUT https://s3...backblazeb2.com/... → B2 DIRECT (slow - actual upload)
PUT https://s3...backblazeb2.com/... → B2 DIRECT (slow - actual upload)
POST /api/uploads/multipart/complete → VPS (fast)
POST /api/uploads/thumbnail/generate → VPS (medium)
POST /api/uploads/register → VPS (fast)
```

## Summary

**Most likely cause:** CORS not configured on B2 bucket

**Solution:** Configure CORS using one of the methods above

**Time to fix:** 5 minutes + 2-3 minutes propagation

**Verification:** Check browser console for CORS errors

See `DIRECT_UPLOAD_SETUP.md` for complete setup instructions.
