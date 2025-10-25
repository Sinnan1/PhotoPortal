# Cloudflare CDN Setup Guide

This guide will help you set up Cloudflare CDN for your photo gallery to improve performance and reduce bandwidth costs.

## Benefits

- **Faster image loading** worldwide (CDN edge locations)
- **Reduced bandwidth costs** on your server
- **DDoS protection** and security
- **Free SSL certificate**
- **Image optimization** (with Cloudflare Pro)

## Step-by-Step Setup

### 1. Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Verify your email

### 2. Add Your Domain

1. Click **"Add a Site"**
2. Enter: `yarrowweddings.cloud`
3. Select **Free Plan** (or Pro for image optimization)
4. Click **"Add Site"**

### 3. Review DNS Records

Cloudflare will scan your existing DNS. Verify these records exist:

```
Type: A
Name: @
Content: <your-server-ip>
Proxy: ON (orange cloud) ✓

Type: A
Name: www
Content: <your-server-ip>
Proxy: ON (orange cloud) ✓
```

**Important:** The orange cloud must be ON to enable CDN.

### 4. Update Nameservers

Cloudflare will provide 2 nameservers like:
```
ava.ns.cloudflare.com
bob.ns.cloudflare.com
```

**Go to your domain registrar** (where you bought yarrowweddings.cloud):
1. Find DNS/Nameserver settings
2. Replace existing nameservers with Cloudflare's nameservers
3. Save changes

**Note:** DNS propagation can take 24-48 hours, but usually completes in 1-2 hours.

### 5. Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode: **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✓ Always Use HTTPS
   - ✓ Automatic HTTPS Rewrites
   - ✓ Minimum TLS Version: 1.2

### 6. Configure Caching

#### Basic Caching
1. Go to **Caching** → **Configuration**
2. Set **Browser Cache TTL**: 4 hours
3. Enable **Always Online**

#### Page Rules for Images
1. Go to **Rules** → **Page Rules**
2. Click **"Create Page Rule"**

**Rule 1: Cache API responses**
```
URL: *yarrowweddings.cloud/api/photos/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 day
```

**Rule 2: Cache static assets**
```
URL: *yarrowweddings.cloud/_next/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

### 7. Performance Optimization

1. Go to **Speed** → **Optimization**
2. Enable:
   - ✓ Auto Minify (JavaScript, CSS, HTML)
   - ✓ Brotli compression
   - ✓ Early Hints
   - ✓ Rocket Loader (test this - may break some JS)

### 8. Security Settings

1. Go to **Security** → **Settings**
2. Set **Security Level**: Medium
3. Enable **Bot Fight Mode**
4. Go to **Security** → **WAF**
5. Enable **Managed Rules** (Free plan includes basic rules)

## Advanced: Serve Images Directly from B2 via Cloudflare

For maximum performance, serve images directly from Backblaze B2 through Cloudflare CDN:

### Step 1: Make B2 Bucket Public

1. Go to Backblaze B2 dashboard
2. Select your bucket: `photo-gallery-production`
3. Go to **Bucket Settings**
4. Set **Bucket Info**: Public
5. Note your B2 endpoint: `https://f005.backblazeb2.com`

### Step 2: Add CNAME in Cloudflare

1. Go to Cloudflare **DNS** settings
2. Add a new record:
   ```
   Type: CNAME
   Name: cdn
   Target: f005.backblazeb2.com
   Proxy: ON (orange cloud) ✓
   ```
3. Save

Your CDN URL will be: `https://cdn.yarrowweddings.cloud`

### Step 3: Configure Backend to Use CDN

On your production server:

```bash
# Edit .env file
nano .env

# Add this line:
CDN_URL=https://cdn.yarrowweddings.cloud

# Restart backend
docker-compose restart backend
```

### Step 4: Update Image URLs (Optional)

If you want to use the CDN helper in your code:

```typescript
import { toCDNUrl, generatePhotoUrls } from './utils/cdnHelper';

// Convert existing B2 URL to CDN URL
const cdnUrl = toCDNUrl(b2Url);

// Or generate all photo URLs with CDN
const urls = generatePhotoUrls(photoKey);
// Returns: { originalUrl, thumbnailUrl, mediumUrl, largeUrl }
```

## Verification

### Check if Cloudflare is Active

1. Visit: https://yarrowweddings.cloud
2. Open browser DevTools → Network tab
3. Reload page
4. Check response headers for any request:
   - Look for: `cf-ray` header
   - Look for: `cf-cache-status` header
   - If present, Cloudflare is active! ✓

### Check CDN Cache Status

Headers you might see:
- `cf-cache-status: HIT` - Served from CDN cache ✓
- `cf-cache-status: MISS` - Not in cache yet (first request)
- `cf-cache-status: DYNAMIC` - Not cacheable
- `cf-cache-status: BYPASS` - Cache bypassed

### Test Image Loading Speed

1. Open an image URL in browser
2. Check DevTools → Network → Timing
3. Should see very fast TTFB (Time To First Byte) after first load

## Troubleshooting

### Images Not Loading

1. Check CORS settings in Backblaze B2
2. Verify CDN CNAME is proxied (orange cloud)
3. Check Cloudflare Page Rules are active
4. Clear Cloudflare cache: **Caching** → **Configuration** → **Purge Everything**

### SSL Errors

1. Verify SSL mode is **Full (strict)**
2. Check your server has valid SSL certificate
3. Wait for Cloudflare SSL to provision (can take 24 hours)

### Cache Not Working

1. Check Page Rules are active and in correct order
2. Verify URLs match the pattern
3. Check response headers for `cache-control`
4. Purge cache and test again

## Monitoring

### Cloudflare Analytics

1. Go to **Analytics & Logs** → **Traffic**
2. Monitor:
   - Requests (total and cached)
   - Bandwidth saved
   - Cache hit ratio
   - Top countries

### Bandwidth Savings

With proper caching, you should see:
- 80-95% cache hit ratio for images
- 50-70% bandwidth reduction on your server
- Faster page loads worldwide

## Cost Optimization

### Free Plan Limits
- Unlimited bandwidth
- Unlimited requests
- Basic DDoS protection
- Shared SSL certificate
- 3 Page Rules

### When to Upgrade to Pro ($20/month)
- Image optimization (Polish, Mirage)
- Mobile optimization
- 20 Page Rules
- WAF (Web Application Firewall)
- Priority support

## Next Steps

1. ✓ Set up Cloudflare CDN
2. Monitor cache hit ratio
3. Optimize cache rules based on analytics
4. Consider Cloudflare Pro for image optimization
5. Set up Cloudflare Workers for advanced caching (optional)

## Support

- Cloudflare Docs: https://developers.cloudflare.com/
- Community: https://community.cloudflare.com/
- Status: https://www.cloudflarestatus.com/
