# Direct Download Setup Guide

This guide walks you through setting up a direct subdomain that bypasses Cloudflare for large photo downloads, preventing timeout issues.

## Overview

When downloading large batches of photos (50+), Cloudflare's 100-second timeout can cause downloads to fail. By creating a direct subdomain (`direct.yarrowweddings.com`) that bypasses Cloudflare, we can handle large downloads without timeouts.

## Step 1: Add DNS Record in Cloudflare

1. Log into your Cloudflare Dashboard
2. Go to your domain → **DNS** → **Records**
3. Click **"Add record"**
4. Configure the record:
   - **Type**: A
   - **Name**: direct
   - **IPv4 address**: Your VPS IP (same as yarrowweddings.com)
   - **Proxy status**: **DNS only** (gray cloud icon) ⚠️ **This is critical!**
   - **TTL**: Auto
5. Click **"Save"**

This creates `direct.yarrowweddings.com` that bypasses Cloudflare entirely.

**Wait 5-10 minutes for DNS propagation before proceeding to Step 2.**

## Step 2: Get SSL Certificate for Direct Subdomain

On your VPS, run the provided script:

```bash
chmod +x setup-direct-ssl.sh
./setup-direct-ssl.sh
```

Or manually:

```bash
# Stop nginx temporarily
docker-compose stop nginx

# Get certificate for direct subdomain
sudo certbot certonly --standalone -d direct.yarrowweddings.com

# Create nginx/ssl directory if it doesn't exist
mkdir -p nginx/ssl

# Copy certificate to nginx/ssl directory
sudo cp /etc/letsencrypt/live/direct.yarrowweddings.com/fullchain.pem nginx/ssl/fullchain-direct.pem
sudo cp /etc/letsencrypt/live/direct.yarrowweddings.com/privkey.pem nginx/ssl/privkey-direct.pem
sudo chmod 644 nginx/ssl/*.pem

# Start nginx back up
docker-compose up -d nginx
```

## Step 3: Configuration Files (Already Updated)

The following files have been updated:

### nginx/nginx.conf
Added a new server block for `direct.yarrowweddings.com`:
- Only allows download endpoints (`/api/photos/*/download`)
- No size limits for downloads
- Extended timeouts (30 minutes)
- Disabled buffering for streaming
- Blocks all other requests (403)

### .env
Added environment variable:
```
NEXT_PUBLIC_DIRECT_DOWNLOAD_URL=https://direct.yarrowweddings.com
```

### Frontend Download Logic
Updated all download functions in:
- `frontend/lib/api.ts`
- `frontend/lib/download-utils.ts`
- `frontend/components/ui/download-filtered-photos.tsx`
- `frontend/src/app/gallery/[id]/page.tsx`

All zip downloads now use the direct domain to bypass Cloudflare timeouts.

## Step 4: Deploy Changes

After completing Steps 1-2, deploy the updated configuration:

```bash
./deploy-production.sh
```

## Step 5: Test the Setup

1. **Test DNS resolution:**
   ```bash
   nslookup direct.yarrowweddings.com
   ```
   Should return your VPS IP (not Cloudflare IPs)

2. **Test SSL certificate:**
   ```bash
   curl -I https://direct.yarrowweddings.com/api/photos/test/download
   ```
   Should return 403 (blocked) but with valid SSL

3. **Test a large download:**
   - Go to a gallery with 50+ liked/favorited photos
   - Click "Download Liked" or "Download Favorites"
   - Check browser console - should see request to `direct.yarrowweddings.com`
   - Download should complete without timeout

## How It Works

### Regular Requests (API calls, page loads, etc.)
```
User → Cloudflare CDN → yarrowweddings.com → Backend
```
- Fast, cached, protected by Cloudflare
- Subject to 100-second timeout

### All Zip Downloads
```
User → direct.yarrowweddings.com → Backend (bypasses Cloudflare)
```
- Direct connection to VPS
- No timeout limits
- No Cloudflare protection (but only download endpoints are exposed)
- Applies to: liked photos, favorited photos, folder downloads, all photos downloads

## Security Considerations

The direct subdomain:
- ✅ Only exposes download endpoints
- ✅ Still requires authentication (JWT token)
- ✅ Still requires gallery password (if set)
- ✅ Blocks all other requests (403)
- ✅ Uses SSL/TLS encryption
- ❌ No DDoS protection from Cloudflare
- ❌ No rate limiting from Cloudflare (nginx rate limiting still applies)

## Troubleshooting

### DNS not resolving
- Wait 10-15 minutes for DNS propagation
- Check Cloudflare DNS settings - ensure "Proxy status" is "DNS only" (gray cloud)

### SSL certificate error
- Ensure certbot successfully created the certificate
- Check certificate files exist in `nginx/ssl/`
- Verify nginx configuration is correct

### Downloads still timing out
- Check browser console - is it using `direct.yarrowweddings.com`?
- Verify `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` is set in `.env`
- Check nginx logs: `docker-compose logs nginx`

### 403 Forbidden on downloads
- Check authentication token is being sent
- Verify gallery password (if required)
- Check backend logs: `docker-compose logs backend`

## Certificate Renewal

The direct subdomain certificate will auto-renew with your main certificate. If you need to manually renew:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/direct.yarrowweddings.com/fullchain.pem nginx/ssl/fullchain-direct.pem
sudo cp /etc/letsencrypt/live/direct.yarrowweddings.com/privkey.pem nginx/ssl/privkey-direct.pem
sudo chmod 644 nginx/ssl/*.pem
docker-compose restart nginx
```

## Monitoring

Monitor direct download usage:
```bash
# Check nginx access logs for direct subdomain
docker-compose logs nginx | grep "direct.yarrowweddings.com"

# Monitor download endpoint performance
docker-compose logs backend | grep "download"
```

## Configuration

All zip downloads automatically use the direct subdomain when `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` is set in `.env`. If not set, downloads fall back to the regular API URL.

To disable direct downloads (use Cloudflare for all requests), simply remove or comment out the `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` variable in `.env`.
