# Direct Download Implementation - Changes Summary

## Overview
All zip downloads now use the direct subdomain (`direct.yarrowweddings.com`) to bypass Cloudflare's 100-second timeout.

## Files Modified

### 1. `.env` & `.env.example`
Added:
```
NEXT_PUBLIC_DIRECT_DOWNLOAD_URL=https://direct.yarrowweddings.com
```

### 2. `nginx/nginx.conf`
Added new server block for `direct.yarrowweddings.com`:
- Listens on port 443 with SSL
- Only allows download endpoints: `/api/photos/*/download`
- No size limits (`client_max_body_size 0`)
- Extended timeouts (30 minutes)
- Disabled buffering for streaming
- Blocks all other requests (403)

### 3. `frontend/lib/download-utils.ts`
- Added `getDownloadBaseUrl()` function
- Returns direct download URL for all zip downloads
- Falls back to API URL if direct URL not configured

### 4. `frontend/lib/api.ts`
Updated all download functions to use `DIRECT_DOWNLOAD_URL`:
- `downloadAllPhotosUnified()`
- `downloadFolderPhotosUnified()`
- `downloadLikedPhotos()`
- `downloadFavoritedPhotos()`

### 5. `frontend/components/ui/download-filtered-photos.tsx`
- Updated to use `getDownloadBaseUrl()`
- All filtered downloads now use direct domain

### 6. `frontend/src/app/gallery/[id]/page.tsx`
- Added `DIRECT_DOWNLOAD_URL` constant
- Updated folder download to use direct domain
- Updated "download all" to use direct domain

## Download Endpoints Using Direct Domain

All of these now bypass Cloudflare:
- ✅ Download all photos in gallery
- ✅ Download folder photos
- ✅ Download liked photos
- ✅ Download favorited photos

## Security

The direct subdomain:
- ✅ Only exposes download endpoints
- ✅ Requires authentication (JWT token)
- ✅ Requires gallery password (if set)
- ✅ Uses SSL/TLS encryption
- ✅ Blocks all non-download requests
- ⚠️ No DDoS protection from Cloudflare
- ⚠️ No rate limiting from Cloudflare (nginx rate limiting still applies)

## Deployment

After SSL certificates are set up, deploy with:
```bash
./deploy-production.sh
```

## Testing

1. Test a download (any type)
2. Check browser network tab - should see request to `direct.yarrowweddings.com`
3. Large downloads should complete without timeout

## Rollback

To disable direct downloads and use Cloudflare for everything:
1. Remove or comment out `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` in `.env`
2. Redeploy

The code will automatically fall back to the regular API URL.
