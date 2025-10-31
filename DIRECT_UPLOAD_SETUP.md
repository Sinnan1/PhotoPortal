# Direct Upload to B2 Setup Guide

This guide explains how to configure Backblaze B2 to allow direct browser uploads, eliminating the need to proxy upload data through your VPS.

## What Changed

**Before:** User → VPS → B2 (2x bandwidth usage on VPS)
**After:** User → B2 directly (0x upload bandwidth on VPS)

The VPS still coordinates the upload (creates multipart sessions, generates presigned URLs, registers photos), but the actual file data goes directly from the browser to B2.

## Benefits

- **50% reduction in VPS bandwidth usage** for uploads
- **Faster uploads** - no VPS bottleneck
- **Lower VPS CPU/memory usage** - no data proxying
- Downloads remain unchanged (still proxied for zip creation)

## Step 1: Configure B2 CORS Settings

You need to configure CORS on your B2 bucket to allow direct browser uploads.

### Option A: Using Backblaze Web Interface

1. Log into your Backblaze account at https://secure.backblaze.com
2. Go to **Buckets** → Select your bucket
3. Click on **Bucket Settings**
4. Scroll to **CORS Rules**
5. Click **Add CORS Rule** and add the following:

```json
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
```

6. Click **Save**

### Option B: Using B2 CLI

If you have the B2 CLI installed:

```bash
# Install B2 CLI if needed
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

# Apply CORS rules
b2 update-bucket --corsRules "$(cat cors-rules.json)" <bucketName> allPrivate
```

### Option C: Using AWS CLI with B2

```bash
# Configure AWS CLI for B2
aws configure --profile b2
# Enter your B2 application key ID as Access Key
# Enter your B2 application key as Secret Key
# Enter your region (e.g., us-west-004)
# Leave output format as json

# Create CORS configuration file
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

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket <your-bucket-name> \
  --cors-configuration file://cors.json \
  --endpoint-url https://s3.us-west-004.backblazeb2.com \
  --profile b2
```

## Step 2: Deploy the Code Changes

The code has already been updated. Deploy to production:

```bash
./deploy-production.sh
```

## Step 3: Test Direct Uploads

1. **Open browser developer tools** (F12)
2. **Go to Network tab**
3. **Upload a photo** to any gallery
4. **Look for PUT requests** in the network tab
5. **Verify the request goes to** `s3.us-west-004.backblazeb2.com` (or your B2 region)
6. **Check the request does NOT go to** your VPS domain

### Expected Network Activity:

```
POST /api/uploads/multipart/create → VPS (creates upload session)
GET /api/uploads/multipart/sign → VPS (gets presigned URL)
PUT https://s3.us-west-004.backblazeb2.com/... → B2 DIRECTLY (uploads chunk)
GET /api/uploads/multipart/sign → VPS (gets next presigned URL)
PUT https://s3.us-west-004.backblazeb2.com/... → B2 DIRECTLY (uploads chunk)
...
POST /api/uploads/multipart/complete → VPS (finalizes upload)
POST /api/uploads/thumbnail/generate → VPS (generates thumbnail)
POST /api/uploads/register → VPS (registers in database)
```

## Step 4: Monitor Bandwidth Usage

After deploying, monitor your VPS bandwidth to confirm the reduction:

```bash
# Check current bandwidth usage
vnstat -d

# Monitor real-time bandwidth
vnstat -l
```

You should see a significant reduction in upload bandwidth on your VPS.

## Troubleshooting

### CORS Error in Browser Console

**Error:** `Access to fetch at 'https://s3...backblazeb2.com/...' from origin 'https://yarrowweddings.com' has been blocked by CORS policy`

**Solution:** 
- Verify CORS rules are correctly configured in B2
- Make sure your domain is in the `allowedOrigins` list
- Wait a few minutes for CORS changes to propagate

### Upload Fails with 403 Forbidden

**Error:** `Failed to upload B2 part: 403 Forbidden`

**Solution:**
- Check that presigned URLs are being generated correctly
- Verify your B2 application key has write permissions
- Ensure the bucket is not set to "public" (should be "private" with presigned URLs)

### Missing ETag in Response

**Error:** `Missing ETag from B2 upload response`

**Solution:**
- Verify `exposeHeaders` includes "ETag" in CORS configuration
- Check browser network tab to see if ETag header is present in response
- Try adding "x-amz-*" to exposeHeaders

### Upload Works Locally but Not in Production

**Solution:**
- Add your production domain to `allowedOrigins` in CORS rules
- Make sure you're using HTTPS in production (B2 requires HTTPS for CORS)
- Check that your production domain matches exactly (with/without www)

## Security Considerations

### Presigned URLs
- URLs expire after 1 hour
- Each URL is unique and can only be used once
- URLs are generated server-side with proper authentication
- Users must be authenticated photographers to get presigned URLs

### CORS Configuration
- Only allows PUT operations (uploads)
- Only allows specific origins (your domains)
- Does not allow public access to bucket
- Presigned URLs still required for all operations

### What's Still Protected
- Gallery access control (unchanged)
- User authentication (unchanged)
- Photo visibility (unchanged)
- Download permissions (unchanged)

## Rollback Plan

If you need to rollback to proxied uploads:

1. **Revert the code changes:**
   ```bash
   git revert HEAD
   ./deploy-production.sh
   ```

2. **Or manually restore the proxy endpoint** in `backend/src/routes/uploads.ts`:
   ```typescript
   router.put(
     '/multipart/upload',
     express.raw({ type: '*/*', limit: CHUNK_UPLOAD_LIMIT }),
     uploadRateLimit,
     authenticateToken,
     requireRole('PHOTOGRAPHER'),
     uploadPartProxy
   )
   ```

3. **Update frontend** `uploadUtils.ts` to use proxy again

## Performance Metrics

### Expected Improvements

**Upload Speed:**
- Before: Limited by VPS upload bandwidth (~100 Mbps typical)
- After: Limited by user's upload speed and B2's capacity (much faster)

**VPS Bandwidth:**
- Before: 200MB VPS bandwidth per 100MB photo (100MB in + 100MB out)
- After: ~1MB VPS bandwidth per 100MB photo (only API calls)

**VPS CPU/Memory:**
- Before: CPU/memory used for proxying data
- After: Minimal CPU/memory (only coordination)

## Additional Notes

- **Downloads are unchanged** - still proxied through VPS for zip creation
- **Thumbnail generation** - still happens on VPS after upload
- **Database registration** - still happens on VPS
- **Authentication** - still required for all operations
- **This only affects the upload data transfer** - all other functionality remains the same

## Support

If you encounter issues:
1. Check browser console for errors
2. Check VPS logs: `docker-compose logs backend`
3. Verify CORS configuration in B2
4. Test with a small file first
5. Check network tab to see where requests are going
