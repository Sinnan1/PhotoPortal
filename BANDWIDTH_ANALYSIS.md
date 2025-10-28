# Bandwidth Analysis & Architecture Review

## Current Architecture

### Image Serving Flow

**For Viewing (Thumbnails & Browsing):**
```
Client Browser → B2 (Direct) → Client
```
- Images are served **directly from Backblaze B2** to clients
- No VPS bandwidth used for viewing
- URLs point directly to B2: `https://s3.us-east-005.backblazeb2.com/bucket/path/to/image.jpg`

**For Downloads (ZIP files):**
```
Client → VPS → B2 → VPS → Client (as ZIP)
```
- VPS streams from B2, creates ZIP on-the-fly, streams to client
- Uses Archiver library with streaming (minimal memory footprint)
- VPS bandwidth = 2× the download size (download from B2 + upload to client)

**For Uploads:**
```
Client → VPS → B2
Client → VPS (thumbnail generation) → B2
```
- Original files: Client → VPS → B2
- Thumbnails: VPS downloads from B2, processes with Sharp, uploads back to B2
- VPS bandwidth = 3× upload size (receive + download for thumbnail + upload thumbnail)

## Bandwidth Calculation Breakdown

### Scenario: 2000 photos, 25MB average per photo

#### 1. Upload Phase
- **Original uploads:** 2000 × 25MB = 50GB
  - Client → VPS: 50GB (VPS ingress)
  - VPS → B2: 50GB (VPS egress)
  
- **Thumbnail generation:** 
  - VPS downloads originals from B2: 50GB (VPS ingress)
  - VPS uploads thumbnails to B2: ~1GB (VPS egress)
  - Thumbnails: 2000 × 500KB = 1GB

**Upload Total VPS Bandwidth:** 50GB + 50GB + 50GB + 1GB = **151GB**

#### 2. Viewing Phase (Gallery Browsing)
- **Thumbnails served:** B2 → Client (Direct)
- **VPS bandwidth used:** **0GB** ✓

#### 3. Download Phase (Single full download)
- **VPS streams from B2:** 50GB (VPS ingress)
- **VPS streams to client:** 50GB (VPS egress)

**Download Total VPS Bandwidth:** 50GB + 50GB = **100GB**

### Total VPS Bandwidth Per Event
- Upload: **151GB**
- Download (once): **100GB**
- **Total:** **251GB** per event

### Multiple Downloads Impact
If clients download multiple times:
- 2 downloads: 151GB + 200GB = **351GB**
- 3 downloads: 151GB + 300GB = **451GB**
- 5 downloads: 151GB + 500GB = **651GB**

## Backblaze B2 Bandwidth Costs

### B2 Pricing
- Storage: $0.005/GB/month
- Egress: First 3× storage is FREE, then $0.01/GB

### B2 Bandwidth for 50GB Storage
- **Free egress:** 50GB × 3 = 150GB/month
- **After 150GB:** $0.01/GB

### B2 Costs for Our Scenario
- Storage: 50GB × $0.005 = **$0.25/month**
- Egress (viewing only): **$0** (within free tier)
- Egress (with downloads): Depends on download frequency

**If clients download directly from B2 (not through VPS):**
- 1 download: 50GB (within free tier)
- 3 downloads: 150GB (within free tier)
- 5 downloads: 250GB = 150GB free + 100GB × $0.01 = **$1.00**

## VPS Bandwidth Limits

### Hostinger VPS Plans
Based on typical VPS hosting:
- **VPS 1:** 1TB/month (~$10/month)
- **VPS 2:** 2TB/month (~$20/month)
- **VPS 3:** 3TB/month (~$30/month)

### Events Per Month by Plan
**VPS 1 (1TB):**
- Upload + 1 download: 251GB → **3-4 events/month**
- Upload + 3 downloads: 451GB → **2 events/month**

**VPS 2 (2TB):**
- Upload + 1 download: 251GB → **7-8 events/month**
- Upload + 3 downloads: 451GB → **4 events/month**

## Critical Issues Identified

### 1. Thumbnail Generation Bandwidth Waste
**Current:** VPS downloads 50GB from B2 just to create thumbnails
**Problem:** This is the biggest bandwidth waste

**Solutions:**
a) **Client-side thumbnail generation** (BEST)
   - Generate thumbnails in browser before upload
   - Upload both original + thumbnail
   - Saves 50GB download per event
   - New bandwidth: 101GB per event (33% reduction)

b) **Backblaze B2 Image Transformations** (if available)
   - Some S3-compatible services offer automatic thumbnails
   - Check if B2 supports this

c) **Cloudflare Workers + Image Resizing**
   - Use Cloudflare Image Resizing ($5/month for 100k images)
   - Generate thumbnails on-demand at edge
   - No VPS bandwidth used

### 2. Download Streaming Through VPS
**Current:** All downloads go through VPS (100GB per download)
**Problem:** Doubles bandwidth usage

**Solutions:**
a) **Direct B2 downloads with pre-signed URLs** (BEST)
   - Generate temporary signed URLs for downloads
   - Client downloads directly from B2
   - VPS only generates URLs (minimal bandwidth)
   - Saves 100GB per download

b) **Cloudflare CDN caching**
   - Cache ZIP files at edge (if feasible)
   - Reduces repeated download bandwidth

### 3. No CDN Currently Active
**Current:** Images served directly from B2
**Problem:** Slower for global users, no caching

**Solution:** Implement Cloudflare CDN (FREE)
- Add CNAME: `cdn.yarrowweddings.cloud` → B2
- Enable caching for images
- Faster loading worldwide
- Reduces B2 egress (cached at edge)

## Recommended Architecture Changes

### Phase 1: Immediate Wins (No Code Changes)
1. **Enable Cloudflare CDN** (FREE)
   - Follow CLOUDFLARE_CDN_SETUP.md
   - Reduces B2 bandwidth via caching
   - Faster image loading

### Phase 2: Client-Side Thumbnails (Medium Effort)
1. **Generate thumbnails in browser before upload**
   - Use browser-image-compression library
   - Upload original + thumbnail together
   - **Saves 50GB per event (33% reduction)**

Implementation:
```typescript
import imageCompression from 'browser-image-compression';

async function uploadWithThumbnail(file: File) {
  // Generate thumbnail
  const thumbnail = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 400,
    useWebWorker: true
  });
  
  // Upload both
  await uploadOriginal(file);
  await uploadThumbnail(thumbnail);
}
```

### Phase 3: Direct B2 Downloads (High Impact)
1. **Use B2 pre-signed URLs for downloads**
   - Generate temporary download URLs
   - Client downloads directly from B2
   - **Saves 100GB per download (40% reduction)**

Implementation:
```typescript
// Backend generates signed URL
const signedUrl = await generateB2SignedUrl(photoKey, 3600); // 1 hour expiry

// Client downloads directly
window.location.href = signedUrl;
```

### Phase 4: Cloudflare Image Resizing (Optional)
1. **Use Cloudflare Image Resizing** ($5/month)
   - On-demand thumbnail generation
   - No server processing needed
   - Cached at edge

## Optimized Bandwidth Calculation

### With All Optimizations
**Upload Phase:**
- Original: 50GB (VPS → B2)
- Thumbnail: 1GB (Client → VPS → B2)
- **Total:** 51GB (66% reduction from 151GB)

**Download Phase:**
- Direct from B2: 0GB VPS bandwidth
- **Total:** 0GB (100% reduction from 100GB)

**Per Event:** 51GB (80% reduction from 251GB)

### Events Per Month (Optimized)
**VPS 1 (1TB):**
- **19 events/month** (vs 3-4 currently)

**VPS 2 (2TB):**
- **39 events/month** (vs 7-8 currently)

## Cloudflare Limits Clarification

### Free Plan Limits
- **Bandwidth:** Unlimited ✓
- **Requests:** Unlimited ✓
- **Page Rules:** 3
- **Workers:** 100,000 requests/day

### What Failed Before?
You mentioned "100 timer" - this likely refers to:
- **Workers CPU time:** 10ms per request (free plan)
- **Workers requests:** 100,000/day (free plan)

**For image serving:** You don't need Workers, just CDN caching
**For image resizing:** Requires paid plan ($5/month)

## Cost Comparison

### Current Setup (No Optimizations)
- VPS: $20/month (2TB plan for 4-7 events)
- B2: $0.25/month
- **Total:** $20.25/month

### Optimized Setup
- VPS: $10/month (1TB plan for 19 events)
- B2: $0.25/month
- Cloudflare: $0/month (free CDN)
- **Total:** $10.25/month

**Savings:** $10/month (50% reduction)

### With Image Resizing
- VPS: $10/month
- B2: $0.25/month
- Cloudflare: $5/month (image resizing)
- **Total:** $15.25/month

**Savings:** $5/month (25% reduction)
**Benefit:** No server processing, faster thumbnails

## Action Plan

### Week 1: Quick Wins
- [ ] Enable Cloudflare CDN (2 hours)
- [ ] Update image URLs to use CDN
- [ ] Test cache hit rates

### Week 2: Client-Side Thumbnails
- [ ] Add browser-image-compression library
- [ ] Update upload flow to generate thumbnails
- [ ] Test thumbnail quality
- [ ] Deploy and monitor bandwidth

### Week 3: Direct Downloads
- [ ] Implement B2 signed URL generation
- [ ] Update download endpoints
- [ ] Test download flow
- [ ] Monitor B2 bandwidth usage

### Week 4: Monitoring & Optimization
- [ ] Set up bandwidth monitoring
- [ ] Analyze cache hit rates
- [ ] Optimize cache rules
- [ ] Document new architecture

## Monitoring Recommendations

### VPS Bandwidth
```bash
# Check current bandwidth usage
vnstat -m

# Monitor real-time
vnstat -l
```

### B2 Bandwidth
- Check B2 dashboard daily
- Set up alerts for egress > 150GB/month
- Monitor storage growth

### Cloudflare Analytics
- Check cache hit ratio (target: >80%)
- Monitor bandwidth saved
- Track request patterns

## Conclusion

**Current Problem:** VPS bandwidth is the bottleneck, not B2 costs.

**Root Causes:**
1. Thumbnail generation downloads 50GB per event (33% waste)
2. Downloads stream through VPS (40% waste)
3. No CDN caching (slower, more B2 egress)

**Solution:** Implement all three optimizations for 80% bandwidth reduction.

**Priority Order:**
1. Cloudflare CDN (immediate, free, easy)
2. Client-side thumbnails (high impact, medium effort)
3. Direct B2 downloads (highest impact, medium effort)

**Expected Result:** 
- 4× more events per month on same VPS plan
- 50% cost reduction
- Faster image loading worldwide
