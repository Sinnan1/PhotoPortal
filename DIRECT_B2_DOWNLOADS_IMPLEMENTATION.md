# Direct B2 Downloads Implementation Plan

## Problem Solved
- Current: ZIP downloads use 100GB VPS bandwidth (50GB from B2 + 50GB to client)
- Solution: Generate B2 pre-signed URLs, client downloads directly from B2
- Savings: 100GB per download = 0GB VPS bandwidth

## Architecture Change

### Before (Current):
```
Client → VPS → B2 (stream) → VPS (create ZIP) → Client
VPS Bandwidth: 100GB per download
```

### After (Direct B2):
```
Client → VPS (generate signed URL) → Client → B2 (direct download)
VPS Bandwidth: ~1KB per download (just the URL)
```

## Implementation Steps

### Step 1: Install B2 SDK for Signed URLs
The AWS SDK already supports pre-signed URLs, we just need to use it.

### Step 2: Create B2 Signed URL Generator
Add function to generate temporary download URLs with authentication.

### Step 3: Update Download Endpoints
Replace streaming logic with signed URL generation.

### Step 4: Update Frontend
Handle redirect to B2 signed URL.

## Benefits

### Bandwidth Savings
- Per wedding (2 downloads): 200GB → 0GB
- Per month (10 weddings): 2TB → 0GB
- **Total VPS bandwidth saved: 2TB/month**

### New Capacity
- Current: 8TB ÷ 151GB = 53 weddings/month
- After fix: 8TB ÷ 51GB = 156 weddings/month
- **3× capacity increase**

### Cost Savings
- Can downgrade VPS plan
- Or handle 3× more events on same plan

### Performance
- Faster downloads (direct from B2)
- No VPS bottleneck
- Better scalability

## Limitations & Considerations

### B2 Signed URLs
- Expire after set time (we'll use 1 hour)
- Client must download within expiry window
- If expired, user can request new URL

### ZIP Creation
- Still need to create ZIP on VPS first time
- But can cache ZIP in B2 for future downloads
- Subsequent downloads are direct from B2

### Progress Tracking
- Can't track download progress server-side
- Use client-side progress tracking instead
- Or skip progress for direct downloads

## Implementation Details

### For Individual Photo Downloads
Already working - just need signed URLs.

### For ZIP Downloads (Two Approaches)

**Approach A: On-Demand ZIP Creation**
1. Client requests download
2. VPS creates ZIP, uploads to B2
3. VPS generates signed URL
4. Client downloads directly from B2
5. First download uses VPS bandwidth
6. Subsequent downloads are free

**Approach B: Pre-Generated ZIPs**
1. After upload completes, VPS creates ZIP
2. Store ZIP in B2 alongside photos
3. All downloads are direct from B2
4. Zero VPS bandwidth for downloads

**Recommendation: Use Approach B (Pre-Generated ZIPs)**
- Best bandwidth savings
- Faster downloads (no wait time)
- Simpler code
- Better UX

## Next Steps

1. Implement B2 signed URL generator
2. Update download endpoints
3. Pre-generate ZIPs after upload
4. Test download flow
5. Deploy and monitor bandwidth

## Expected Timeline
- Implementation: 2-3 hours
- Testing: 1 hour
- Deployment: 30 minutes
- **Total: 4 hours**

## Risk Assessment
- **Low risk** - B2 signed URLs are standard S3 feature
- Fallback: Keep current streaming as backup
- Can roll back instantly if issues

## Success Metrics
- VPS bandwidth for downloads: 100GB → 0GB
- Download speed: Faster (direct from B2)
- User experience: Same or better
- Capacity: 53 → 156 weddings/month
