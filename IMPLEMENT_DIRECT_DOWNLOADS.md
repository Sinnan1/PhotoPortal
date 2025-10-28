# Implement Direct B2 Downloads - Step by Step Guide

## What We Just Built

✅ **Backend Infrastructure Complete:**
- B2 pre-signed URL generator (`s3Storage.ts`)
- Direct download service (`directDownloadService.ts`)
- New API endpoints for direct downloads
- Full authentication and access control

## Bandwidth Savings

### Current (Streaming through VPS):
```
Single photo download: 25MB VPS bandwidth
ZIP download (2000 photos): 100GB VPS bandwidth
```

### After Implementation (Direct B2):
```
Single photo download: 1KB VPS bandwidth (just the URL)
ZIP download: 0GB VPS bandwidth (direct from B2)
```

### Per Wedding Impact:
- Current: 151GB (upload) + 100GB (downloads) = 251GB
- After: 51GB (upload) + 0GB (downloads) = 51GB
- **Savings: 200GB per wedding (80% reduction)**

## Implementation Steps

### Phase 1: Individual Photo Downloads (Easiest - 1 hour)

#### Step 1: Update Frontend API Client

Add to `frontend/lib/api.ts`:

```typescript
// Get direct download URL for a photo
getDirectPhotoDownloadUrl: (photoId: string) =>
  apiRequest(`/photos/${photoId}/direct-download-url`, {
    method: 'GET',
  }),

// Download photo directly from B2
downloadPhotoDirect: async (photoId: string) => {
  const response = await apiRequest(`/photos/${photoId}/direct-download-url`, {
    method: 'GET',
  });
  
  if (response.success && response.data.url) {
    // Redirect to B2 signed URL
    window.location.href = response.data.url;
  }
  
  return response;
},
```

#### Step 2: Update Photo Download Handler

In `frontend/src/app/gallery/[id]/page.tsx`, replace:

```typescript
// OLD (streams through VPS)
const handleDownload = async (photoId: string) => {
  await api.downloadPhotoData(photoId, photo.filename);
};
```

With:

```typescript
// NEW (direct from B2)
const handleDownload = async (photoId: string) => {
  try {
    showToast("Preparing download...", "info");
    await api.downloadPhotoDirect(photoId);
    showToast("Download started!", "success");
  } catch (error) {
    showToast("Download failed", "error");
  }
};
```

#### Step 3: Test Individual Photo Downloads

1. Deploy backend changes
2. Test downloading a single photo
3. Verify it downloads directly from B2
4. Check VPS bandwidth (should be ~1KB per download)

**Expected Result:** Individual photo downloads work, use zero VPS bandwidth

---

### Phase 2: Batch Photo Downloads (Medium - 2 hours)

For downloading multiple selected photos without creating a ZIP.

#### Step 1: Add Batch Download API

Add to `frontend/lib/api.ts`:

```typescript
// Get direct download URLs for multiple photos
getDirectMultiplePhotoDownloadUrls: (photoIds: string[]) =>
  apiRequest('/photos/direct-download-urls', {
    method: 'POST',
    body: JSON.stringify({ photoIds }),
  }),

// Download multiple photos directly
downloadMultiplePhotosDirect: async (photoIds: string[]) => {
  const response = await apiRequest('/photos/direct-download-urls', {
    method: 'POST',
    body: JSON.stringify({ photoIds }),
  });
  
  if (response.success && response.data) {
    // Download each photo in sequence
    for (const photo of response.data) {
      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create hidden link and click it
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = photo.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  return response;
},
```

#### Step 2: Add UI for Batch Downloads

Add a "Download Selected" button that uses the new API.

#### Step 3: Test Batch Downloads

1. Select multiple photos
2. Click "Download Selected"
3. Verify all photos download directly from B2
4. Check VPS bandwidth (should be ~1KB total)

**Expected Result:** Batch downloads work, use zero VPS bandwidth

---

### Phase 3: Filtered Downloads (Liked/Favorited) (Medium - 2 hours)

#### Step 1: Add Filtered Download API

Add to `frontend/lib/api.ts`:

```typescript
// Get direct download URLs for liked/favorited photos
getDirectFilteredPhotoDownloadUrls: (galleryId: string, filterType: 'liked' | 'favorited') =>
  apiRequest(`/photos/gallery/${galleryId}/direct-download-urls?filterType=${filterType}`, {
    method: 'GET',
  }),

// Download liked/favorited photos directly
downloadFilteredPhotosDirect: async (galleryId: string, filterType: 'liked' | 'favorited') => {
  const response = await apiRequest(
    `/photos/gallery/${galleryId}/direct-download-urls?filterType=${filterType}`,
    { method: 'GET' }
  );
  
  if (response.success && response.data) {
    // Download each photo
    for (const photo of response.data) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = photo.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  return response;
},
```

#### Step 2: Update Download Buttons

Replace ZIP download buttons with direct download buttons for liked/favorited photos.

#### Step 3: Test Filtered Downloads

1. Like/favorite some photos
2. Click "Download Liked" or "Download Favorited"
3. Verify photos download directly from B2
4. Check VPS bandwidth (should be ~1KB)

**Expected Result:** Filtered downloads work, use zero VPS bandwidth

---

### Phase 4: Full Gallery ZIP Downloads (Advanced - 4 hours)

For full gallery downloads, we have two options:

#### Option A: Keep Current Streaming (Simplest)
- Keep ZIP downloads streaming through VPS
- Only use direct downloads for individual/batch photos
- Still saves 80% of bandwidth (most users don't download full gallery)

#### Option B: Pre-Generate ZIPs (Best)
- After upload completes, create ZIP and store in B2
- Serve ZIP via direct B2 download
- First download uses VPS bandwidth, subsequent downloads are free

**Recommendation: Start with Option A, implement Option B later if needed**

---

## Deployment Steps

### 1. Install Dependencies

```bash
cd backend
npm install @aws-sdk/s3-request-presigner
```

### 2. Build Backend

```bash
npm run build
```

### 3. Deploy to Production

```bash
# Copy new files to VPS
scp -r backend/src/services/directDownloadService.ts user@vps:/path/to/backend/src/services/
scp backend/src/utils/s3Storage.ts user@vps:/path/to/backend/src/utils/
scp backend/src/controllers/photoController.ts user@vps:/path/to/backend/src/controllers/
scp backend/src/routes/photos.ts user@vps:/path/to/backend/src/routes/

# SSH into VPS
ssh user@vps

# Rebuild and restart
cd /path/to/backend
npm install
npm run build
docker-compose restart backend
```

### 4. Test in Production

```bash
# Test single photo download
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yarrowweddings.com/api/photos/PHOTO_ID/direct-download-url

# Should return:
# {
#   "success": true,
#   "data": {
#     "url": "https://s3.us-west-004.backblazeb2.com/...",
#     "filename": "photo.jpg"
#   }
# }
```

### 5. Monitor Bandwidth

```bash
# Check VPS bandwidth usage
vnstat -d

# Should see dramatic reduction in egress after implementation
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Revert to previous version
git checkout HEAD~1 backend/src/controllers/photoController.ts
git checkout HEAD~1 backend/src/routes/photos.ts

# Rebuild and restart
npm run build
docker-compose restart backend
```

Old streaming downloads will still work.

---

## Testing Checklist

### Individual Photo Downloads
- [ ] Download single photo as photographer
- [ ] Download single photo as client
- [ ] Download from password-protected gallery
- [ ] Verify URL expires after 1 hour
- [ ] Check VPS bandwidth (~1KB per download)

### Batch Photo Downloads
- [ ] Download 10 selected photos
- [ ] Download 100 selected photos
- [ ] Verify all photos download correctly
- [ ] Check VPS bandwidth (~1KB total)

### Filtered Downloads
- [ ] Download liked photos
- [ ] Download favorited photos
- [ ] Verify correct photos download
- [ ] Check VPS bandwidth (~1KB)

### Access Control
- [ ] Verify password protection works
- [ ] Verify client access control works
- [ ] Verify expired galleries are blocked
- [ ] Verify unauthorized access is blocked

---

## Expected Results

### Bandwidth Usage (Per Wedding)

**Before:**
- Upload: 151GB
- Downloads (2 people): 200GB
- **Total: 351GB**

**After:**
- Upload: 51GB (with client-side thumbnails - future optimization)
- Downloads: 0GB (direct from B2)
- **Total: 51GB**

**Savings: 300GB per wedding (85% reduction)**

### Capacity Increase

**Before:**
- 8TB ÷ 351GB = **22 weddings/month**

**After:**
- 8TB ÷ 51GB = **156 weddings/month**

**7× capacity increase**

### Cost Savings

**Before:**
- Need 8TB VPS plan: ~$40/month

**After:**
- Can use 2TB VPS plan: ~$20/month
- **Save $20/month (50% reduction)**

Or handle 7× more events on same plan.

---

## Next Steps

1. **Deploy Phase 1** (Individual photo downloads) - 1 hour
2. **Test thoroughly** - 1 hour
3. **Monitor bandwidth for 1 week**
4. **Deploy Phase 2** (Batch downloads) - 2 hours
5. **Deploy Phase 3** (Filtered downloads) - 2 hours
6. **Evaluate need for Phase 4** (ZIP pre-generation)

**Total implementation time: 6-8 hours**
**Expected bandwidth savings: 80-85%**
**Expected capacity increase: 7×**

---

## Support

If you encounter issues:

1. Check backend logs: `docker logs backend`
2. Verify B2 credentials are correct
3. Test signed URL generation manually
4. Check Cloudflare isn't blocking B2 requests
5. Verify CORS settings on B2 bucket

---

## Future Optimizations

After this is working:

1. **Client-side thumbnail generation** (saves 50GB upload bandwidth)
2. **ZIP pre-generation** (cache ZIPs in B2)
3. **Cloudflare CDN for images** (faster loading, free bandwidth)
4. **Progressive download UI** (better UX for batch downloads)

Each optimization compounds the savings!
