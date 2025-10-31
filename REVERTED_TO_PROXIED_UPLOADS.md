# Reverted to Proxied Uploads

## Decision

After testing, **proxied uploads through VPS are significantly faster** than direct B2 uploads due to CORS preflight delays. We've reverted to the proxied upload system.

## What Changed (Reverted)

### Frontend (`frontend/lib/uploadUtils.ts`)
**Reverted to:** Upload chunks through VPS proxy at `/uploads/multipart/upload`

```typescript
// OLD (slow): Direct to B2
const uploadResponse = await fetch(signedUrl, {
  method: "PUT",
  body: chunk,
});

// NEW (fast): Through VPS proxy
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

### Backend (`backend/src/routes/uploads.ts`)
**Restored:** Proxy endpoint for chunk uploads

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

## Upload Flow (Current)

```
User Browser
    ↓
    ↓ (10MB chunks)
    ↓
VPS Backend (/uploads/multipart/upload)
    ↓
    ↓ (proxies to B2 using presigned URL)
    ↓
Backblaze B2
```

## Performance Comparison

### Direct B2 Upload (Attempted)
- ❌ CORS preflight: 16+ seconds per chunk
- ❌ Multiple chunks = multiple slow preflights
- ❌ User's connection to B2 may be slow
- ✅ Saves VPS bandwidth

**Result:** Very slow, poor user experience

### Proxied Upload (Current)
- ✅ No CORS preflight delays
- ✅ VPS has fast connection to B2
- ✅ Single request per chunk
- ✅ Much faster uploads
- ❌ Uses VPS bandwidth (2x: user→VPS + VPS→B2)

**Result:** Fast, excellent user experience

## Bandwidth Impact

For a 100MB photo upload:
- **User → VPS:** 100MB
- **VPS → B2:** 100MB
- **Total VPS bandwidth:** 200MB

This is acceptable given the significant speed improvement.

## What Stayed the Same

✅ **Downloads** - Still proxied through VPS (for zip creation)
✅ **Thumbnail generation** - Single size (1200x1200px)
✅ **Multipart upload** - Still uses chunked uploads
✅ **Authentication** - Unchanged
✅ **Gallery access control** - Unchanged

## Why Direct Upload Failed

1. **CORS Preflight Delay:** B2's CORS preflight takes 16+ seconds
2. **Multiple Chunks:** Each chunk triggers a preflight
3. **Cumulative Delay:** 10 chunks = 160+ seconds of just preflight overhead
4. **User Connection:** User's connection to B2 may be slower than VPS→B2

Even with CORS optimization (`maxAgeSeconds: 86400`), the first upload would still be very slow.

## Benefits of Proxied System

1. **Speed:** No CORS delays, fast VPS→B2 connection
2. **Reliability:** VPS has stable connection to B2
3. **Simplicity:** No CORS configuration needed
4. **Consistency:** Same pattern as downloads

## Trade-offs

**Pros:**
- ✅ Much faster uploads
- ✅ Better user experience
- ✅ More reliable
- ✅ No CORS issues

**Cons:**
- ❌ Uses VPS bandwidth (2x file size)
- ❌ VPS CPU/memory for proxying

**Verdict:** The speed improvement is worth the bandwidth cost.

## Deployment

```bash
./deploy-production.sh
```

## Testing

1. Upload 3 photos
2. Check browser Network tab
3. Should see requests to `/api/uploads/multipart/upload` (VPS)
4. Should NOT see requests to `s3.backblazeb2.com`
5. Uploads should be fast

## Monitoring

### Check VPS Bandwidth Usage
```bash
vnstat -d
```

You'll see increased upload bandwidth, but uploads will be much faster.

### Check Upload Speed
- Small files (< 10MB): Should complete in seconds
- Large files (100MB+): Should show steady progress
- No long pauses or timeouts

## Future Optimization

If VPS bandwidth becomes a concern, consider:

1. **Upgrade VPS bandwidth** - Usually cheap
2. **Optimize CORS further** - May reduce preflight time
3. **Use CDN for uploads** - CloudFlare R2 has better CORS
4. **Hybrid approach** - Direct for small files, proxy for large

For now, proxied uploads provide the best user experience.

## Summary

- ✅ Reverted to proxied uploads through VPS
- ✅ Much faster than direct B2 uploads
- ✅ No CORS configuration needed
- ✅ Better user experience
- ⚠️ Uses VPS bandwidth (acceptable trade-off)

The system is now optimized for speed and reliability.
