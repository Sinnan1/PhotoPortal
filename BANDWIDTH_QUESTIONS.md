# Critical Bandwidth Questions - Need Your Input

## 1. VPS Plan Details

### Question: What EXACTLY is your 8TB limit?
**Need to know:**
- [ ] Is it 8TB total (ingress + egress)?
- [ ] Is it 8TB egress only?
- [ ] Is there a separate ingress limit?
- [ ] What happens if you exceed? (throttled, charged, blocked?)

**How to check:**
1. Log into Hostinger control panel
2. Go to VPS → Bandwidth/Traffic section
3. Screenshot the bandwidth limits and current usage
4. Look for terms like "transfer", "egress", "outbound", "inbound"

**Why this matters:**
- If it's egress-only, uploads don't count (saves 50GB per event)
- If it's total, we need to optimize both directions

---

## 2. Current Actual Usage

### Question: What's your current bandwidth usage?
**Run this command on your VPS:**
```bash
# Make script executable
chmod +x check-bandwidth-status.sh

# Run the check
bash check-bandwidth-status.sh > bandwidth-status-report.txt 2>&1

# View the report
cat bandwidth-status-report.txt
```

**Then tell me:**
- [ ] Current month's total bandwidth (from vnstat)
- [ ] Average daily bandwidth
- [ ] Peak usage days
- [ ] How many events have you hosted so far?

**If vnstat shows no data:**
```bash
# Install vnstat
sudo apt-get update && sudo apt-get install -y vnstat

# Wait 5 minutes for it to collect data, then check
vnstat
```

---

## 3. ZIP Download Business Requirements

### Question: Why do users need ZIPs?
**Tell me about your use case:**
- [ ] What type of events? (weddings, corporate, portraits?)
- [ ] How many photos per event typically?
- [ ] Who downloads? (clients, photographers, both?)
- [ ] What do they do with the photos? (print, share, archive?)

### Question: How often do they download vs. just view?
**Estimate these percentages:**
- [ ] % of users who only view/browse: ____%
- [ ] % of users who download selected photos: ____%
- [ ] % of users who download ALL photos: ____%
- [ ] Average number of downloads per gallery: ____

### Question: Can this be redesigned?
**Consider these alternatives:**

**Option A: Individual Photo Downloads**
- Users select photos they want
- Download individually or in small batches
- Reduces bandwidth (most users don't need ALL photos)
- **Bandwidth impact:** 90% reduction if users download 10% of photos

**Option B: Photographer-Only Full Downloads**
- Clients can only download selected photos
- Photographers can download full gallery (for backup)
- **Bandwidth impact:** 70% reduction if 70% of downloads are clients

**Option C: External Delivery Service**
- Use WeTransfer, Dropbox, or Google Drive for full gallery delivery
- Your platform for viewing/selection only
- **Bandwidth impact:** 100% reduction for full downloads

**Option D: Tiered Download System**
- Free: View and download up to 50 photos
- Paid: Download full gallery
- **Bandwidth impact:** Depends on conversion rate

**Which option fits your business model?**

---

## 4. Cloudflare Setup Status

### Question: Are you actually using Cloudflare CDN right now?
**Check these:**

1. **DNS Check:**
```bash
dig NS yarrowweddings.cloud +short
```
**Should show:** `*.ns.cloudflare.com`
**If not:** Cloudflare is NOT active

2. **Header Check:**
```bash
curl -I https://yarrowweddings.cloud | grep cf-ray
```
**Should show:** `cf-ray: xxxxx-XXX`
**If not:** Cloudflare is NOT proxying traffic

3. **Visual Check:**
- Go to Cloudflare dashboard
- Check if orange cloud is ON for your domain
- Check SSL/TLS mode (should be "Full (strict)")

**Current status:**
- [ ] Cloudflare nameservers: YES / NO
- [ ] Orange cloud enabled: YES / NO
- [ ] cf-ray header present: YES / NO
- [ ] CDN_URL in .env: YES / NO / WHAT VALUE?

### Question: What was the "100 timer" error?
**Need exact details:**
- [ ] What was the EXACT error message?
- [ ] When did it occur? (during upload, download, viewing?)
- [ ] What were you trying to do?
- [ ] Screenshot or log file?

**Possible causes:**
1. **Cloudflare Workers CPU time limit** (10ms per request on free plan)
   - Did you try to use Workers for image processing?
   - Workers are NOT needed for CDN caching

2. **Cloudflare Page Rules limit** (3 on free plan)
   - Did you create more than 3 page rules?
   - Can be optimized to use fewer rules

3. **Cloudflare Rate Limiting** (100 requests per minute?)
   - Did you hit a rate limit?
   - Can be adjusted in settings

4. **Something else entirely**
   - Need more details to diagnose

### Question: Have you set up Bandwidth Alliance properly?
**Bandwidth Alliance = Free egress from B2 to Cloudflare**

**Check if configured:**
1. Is your B2 bucket public?
2. Did you add CNAME in Cloudflare DNS?
   - `cdn.yarrowweddings.cloud` → `s3.us-east-005.backblazeb2.com`
3. Is the CNAME proxied (orange cloud ON)?
4. Is CDN_URL set in your .env?

**Current status:**
- [ ] B2 bucket is public: YES / NO
- [ ] CNAME exists: YES / NO
- [ ] CNAME is proxied: YES / NO
- [ ] CDN_URL configured: YES / NO

**If NOT configured:**
- You're paying for B2 egress unnecessarily
- Images are slower (no edge caching)
- Follow CLOUDFLARE_CDN_SETUP.md to fix

---

## 5. Additional Context Needed

### Current Architecture Understanding
**Confirm my understanding:**

**For Uploads:**
```
Client → VPS (receive) → B2 (store original)
VPS → B2 (download for thumbnail) → VPS (process) → B2 (store thumbnail)
```
- [ ] Is this correct?
- [ ] Or do you upload thumbnails differently?

**For Viewing:**
```
Client → B2 (direct download of thumbnails/images)
```
- [ ] Is this correct?
- [ ] Or does it go through VPS?

**For Downloads (ZIP):**
```
Client → VPS → B2 (stream photos) → VPS (create ZIP) → Client
```
- [ ] Is this correct?
- [ ] Or do you use a different method?

### Business Context
- [ ] How many events per month do you expect?
- [ ] Average photos per event?
- [ ] Average file size per photo?
- [ ] How long do galleries stay active?
- [ ] Do you delete old galleries?

---

## Action Items

**Please provide:**

1. **Run the bandwidth check script:**
   ```bash
   bash check-bandwidth-status.sh > bandwidth-status-report.txt 2>&1
   ```
   Then share the output

2. **Check Hostinger control panel:**
   - Screenshot bandwidth limits
   - Screenshot current usage
   - Note the exact plan name

3. **Answer the business questions:**
   - Download frequency and patterns
   - User behavior (view vs download)
   - Business requirements for ZIP downloads

4. **Clarify Cloudflare status:**
   - Is it currently active?
   - What was the exact error?
   - Is Bandwidth Alliance configured?

5. **Provide usage statistics:**
   - How many events hosted so far?
   - Total bandwidth used this month?
   - Any bandwidth overages or warnings?

---

## Why This Matters

**Without this information, I can't:**
- Calculate accurate bandwidth requirements
- Recommend the right optimizations
- Estimate cost savings
- Design the optimal architecture

**With this information, I can:**
- Give you exact bandwidth calculations
- Prioritize optimizations by impact
- Estimate how many events you can handle
- Design a solution that fits your business model
- Save you money on hosting costs

---

## Quick Wins While We Wait

**These are safe to do now:**

1. **Install vnstat** (if not installed):
   ```bash
   sudo apt-get update && sudo apt-get install -y vnstat
   ```

2. **Check current Docker stats**:
   ```bash
   docker stats --no-stream
   ```

3. **Check recent bandwidth usage**:
   ```bash
   # If vnstat is installed
   vnstat -d
   ```

4. **Test Cloudflare status**:
   ```bash
   curl -I https://yarrowweddings.cloud | grep -i cf-
   ```

5. **Review your .env file**:
   ```bash
   grep -E "CDN_URL|S3_BUCKET|AWS_REGION" .env
   ```

---

## Next Steps

Once you provide the information above, I will:

1. Create a detailed bandwidth optimization plan
2. Prioritize changes by impact and effort
3. Provide exact implementation steps
4. Estimate bandwidth savings and cost reduction
5. Help you implement the highest-impact changes first

**Estimated time to gather info:** 30 minutes
**Estimated time to implement optimizations:** 2-4 hours
**Expected bandwidth reduction:** 60-80%
**Expected cost savings:** $10-20/month
