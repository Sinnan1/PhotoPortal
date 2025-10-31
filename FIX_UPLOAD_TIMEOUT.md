# Fix Upload Timeout Issues

## Current Problem

Uploads are timing out with `net::ERR_TIMED_OUT` when uploading to B2:
```
PUT https://s3.us-west-004.backblazeb2.com/... net::ERR_TIMED_OUT
```

## Root Causes

### 1. CORS Configuration Issue
Your CORS might be partially configured but missing critical settings.

### 2. Network/Firewall Blocking
Something might be blocking direct connections to B2.

### 3. File Size vs Timeout
Large files timing out before upload completes.

## Solutions

### Solution 1: Verify Complete CORS Configuration

Your CORS must include **ALL** of these:

```json
{
  "corsRuleName": "allowDirectUploads",
  "allowedOrigins": [
    "https://yarrowweddings.com",
    "https://www.yarrowweddings.com",
    "http://localhost:3000",
    "*"
  ],
  "allowedOperations": [
    "s3_put",
    "s3_get",
    "s3_head"
  ],
  "allowedHeaders": [
    "*"
  ],
  "exposeHeaders": [
    "ETag",
    "x-amz-request-id",
    "x-amz-id-2",
    "x-amz-version-id"
  ],
  "maxAgeSeconds": 3600
}
```

**Key changes:**
- Added `"*"` to allowedOrigins (temporary for testing)
- Added `s3_get` and `s3_head` operations
- Added more expose headers

### Solution 2: Check B2 Endpoint Accessibility

Test if you can reach B2 from your browser:

```bash
# In browser console
fetch('https://s3.us-west-004.backblazeb2.com/', {method: 'HEAD'})
  .then(r => console.log('B2 reachable:', r.status))
  .catch(e => console.error('B2 not reachable:', e))
```

If this fails, there's a network/firewall issue.

### Solution 3: Increase Timeout Settings

The default browser timeout might be too short for large files.

**Current issue:** No timeout specified in fetch request.

**Fix:** Add timeout to upload requests.

Edit `frontend/lib/uploadUtils.ts`:

```typescript
// Add timeout wrapper
const uploadWithTimeout = (url: string, options: RequestInit, timeoutMs: number = 300000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout')), timeoutMs)
    )
  ]);
};

// Then use it:
const uploadResponse = await uploadWithTimeout(signedUrl, {
  method: "PUT",
  headers: {
    "Content-Type": "application/octet-stream",
  },
  body: chunk,
}, 300000); // 5 minutes per chunk
```

### Solution 4: Reduce Chunk Size

Smaller chunks = less likely to timeout.

Edit `backend/src/config/uploadConfig.ts` and `frontend/src/config/uploadConfig.ts`:

```typescript
CHUNK_SIZE: 5 * 1024 * 1024,  // Change from 10MB to 5MB
```

Smaller chunks upload faster and are less likely to timeout.

### Solution 5: Test with Smaller File First

Try uploading a very small file (< 1MB) to isolate the issue:
- If small file works → timeout issue with large files
- If small file fails → CORS/network issue

## Quick Fix: Revert to Proxied Uploads

If direct uploads keep failing, temporarily revert to proxied uploads:

### 1. Restore Backend Proxy

Edit `backend/src/routes/uploads.ts`:

```typescript
import { uploadPartProxy } from '../controllers/uploadsController'

// Add back proxy endpoint
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

### 2. Restore Frontend Proxy Call

Edit `frontend/lib/uploadUtils.ts` - find this section:

```typescript
// Upload chunk directly to B2 using presigned URL
console.debug("Uploading part", partNumber, "directly to B2");
const uploadResponse = await fetch(signedUrl, {
  method: "PUT",
  headers: {
    "Content-Type": "application/octet-stream",
  },
  body: chunk,
});
```

Replace with:

```typescript
// Upload chunk through backend proxy
console.debug("Uploading part", partNumber, "via proxy");
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

if (!uploadResponse.ok) {
  const text = await uploadResponse.text().catch(() => "<no body>");
  throw new Error(
    `Failed to upload B2 part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText} - ${text}`
  );
}

// Get ETag from proxy response
const uploadResult = await uploadResponse.json();
if (!uploadResult.success) {
  throw new Error(uploadResult.error || "B2 upload part failed");
}

const etag = uploadResult.etag;
if (!etag) {
  throw new Error("Missing ETag from B2 upload response");
}
```

### 3. Deploy

```bash
./deploy-production.sh
```

This will restore working uploads through VPS proxy while you debug the direct upload issue.

## Diagnostic Steps

### Step 1: Check Backend Logs

```bash
# On VPS
docker-compose logs backend --tail=100 -f

# Look for errors related to:
# - ListPartsCommand
# - AbortMultipartUploadCommand
# - B2 errors
```

### Step 2: Check Network Tab

In browser DevTools → Network:
1. Filter by "backblazeb2.com"
2. Try upload
3. Click on failed PUT request
4. Check:
   - **Status:** Should be 200, seeing timeout
   - **Headers:** Check if CORS headers present
   - **Timing:** See where it's spending time

### Step 3: Test CORS Directly

```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://yarrowweddings.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" \
  -v \
  https://s3.us-west-004.backblazeb2.com/photo-gallery-production/test.txt

# Should return CORS headers in response
```

### Step 4: Check B2 Bucket Settings

1. Go to Backblaze dashboard
2. Check bucket is **not** behind Cloudflare
3. Check bucket region matches your code (us-west-004)
4. Verify CORS rules are saved and active

## Expected vs Actual

### Expected Behavior:
```
1. Create multipart upload → Success
2. Get signed URL → Success
3. PUT to B2 → Success (200 OK, ETag returned)
4. Complete upload → Success
```

### Actual Behavior:
```
1. Create multipart upload → Success
2. Get signed URL → Success
3. PUT to B2 → TIMEOUT (net::ERR_TIMED_OUT)
4. Abort upload → 500 error
```

## Most Likely Cause

Based on the error pattern, the issue is:

**Network connectivity to B2 is blocked or very slow**

Possible reasons:
1. ISP blocking B2 endpoints
2. Firewall/antivirus blocking
3. VPN interfering
4. B2 region having issues
5. CORS preflight hanging

## Recommended Action

**Temporarily revert to proxied uploads** (see Quick Fix above) to get uploads working immediately, then debug the direct upload issue separately.

The proxied upload system was working before, so reverting will restore functionality while you investigate why direct B2 access is timing out.
