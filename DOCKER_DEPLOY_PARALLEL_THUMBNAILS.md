# Docker Deployment - Parallel Thumbnails

## Quick Deploy (3 Commands)

Since you're using Docker, deployment is super simple:

```bash
# SSH to your VPS
ssh root@your-vps-ip

# Navigate to project
cd /opt/photo-gallery  # or wherever your project is

# Pull latest code
git pull origin main

# Rebuild and restart (this compiles the worker automatically)
docker compose up -d --build

# Done! Check logs
docker compose logs -f backend
```

That's it! Docker automatically:
- ✅ Compiles the worker thread
- ✅ Installs dependencies
- ✅ Restarts services
- ✅ Preserves database

---

## What Happens During Build

```bash
docker compose up -d --build
```

This command:
1. Pulls latest code (if you ran git pull)
2. Rebuilds backend image
3. Compiles TypeScript (including worker)
4. Installs dependencies
5. Restarts containers
6. Zero downtime (old container runs until new one is ready)

---

## Verify Deployment

### Check Worker Compiled
```bash
# Check if worker exists in container
docker compose exec backend ls dist/workers/thumbnailWorker.js

# Should output: dist/workers/thumbnailWorker.js
```

### Check Logs
```bash
# Watch logs for parallel queue initialization
docker compose logs -f backend | grep -i parallel

# Should see:
# 🚀 Parallel Thumbnail Queue initialized with X workers (X CPUs available)
```

### Monitor CPU Usage
```bash
# In another terminal, watch CPU
htop

# Or use docker stats
docker stats
```

---

## Test Upload

1. Upload 10-20 photos
2. Watch logs: `docker compose logs -f backend`
3. Watch CPU: `htop` or `docker stats`
4. Should see:
   - CPU usage spike to 80-100%
   - Multiple worker processes
   - Fast thumbnail completion

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Stop current containers
docker compose down

# Checkout previous commit
git log --oneline  # Find previous commit hash
git checkout <previous-commit-hash>

# Rebuild with old code
docker compose up -d --build

# Or use previous image
docker images  # Find previous image
docker tag <old-image-id> photo-gallery-backend:latest
docker compose up -d
```

---

## Full Deployment Script

Save this as `deploy-parallel.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Parallel Thumbnails..."

# Navigate to project
cd /opt/photo-gallery

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Backup current state
echo "💾 Creating backup..."
docker compose exec -T postgres pg_dump -U photo_user photo_gallery | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Rebuild and restart
echo "🔨 Building and restarting..."
docker compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services..."
sleep 10

# Check if worker exists
echo "✅ Verifying worker..."
if docker compose exec backend ls dist/workers/thumbnailWorker.js > /dev/null 2>&1; then
    echo "✅ Worker compiled successfully!"
else
    echo "❌ Worker not found! Deployment may have failed."
    exit 1
fi

# Show logs
echo "📋 Showing logs (Ctrl+C to exit)..."
docker compose logs -f backend

echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x deploy-parallel.sh
```

Run:
```bash
./deploy-parallel.sh
```

---

## Docker Compose Configuration

Your `docker-compose.yml` should already be configured correctly. The backend service automatically:
- Builds from `backend/Dockerfile`
- Compiles TypeScript (including worker)
- Has access to all CPU cores (Docker default)

No changes needed to docker-compose.yml!

---

## Environment Variables

No new environment variables needed! The parallel system uses existing config:
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

---

## CPU Cores in Docker

Docker containers have access to **all host CPU cores** by default.

To verify:
```bash
# Check CPU count in container
docker compose exec backend node -e "console.log(require('os').cpus().length)"

# Should match your VPS CPU count
```

To limit (optional):
```yaml
# In docker-compose.yml
backend:
  deploy:
    resources:
      limits:
        cpus: '4'  # Limit to 4 cores
```

---

## Monitoring After Deployment

### Watch Logs
```bash
docker compose logs -f backend
```

### Watch CPU
```bash
# Host CPU
htop

# Container CPU
docker stats
```

### Check Queue Status
```bash
# If you add a status endpoint
curl http://localhost:5000/api/thumbnails/status
```

---

## Troubleshooting

### Worker Not Found
```bash
# Rebuild without cache
docker compose build --no-cache backend
docker compose up -d backend
```

### High Memory Usage
```bash
# Limit backend memory
# Add to docker-compose.yml:
backend:
  deploy:
    resources:
      limits:
        memory: 4G
```

### Worker Timeout
```bash
# Increase timeout in parallelThumbnailQueue.ts
# Then rebuild:
docker compose up -d --build backend
```

---

## Summary

**Deployment Steps:**
1. `git pull origin main`
2. `docker compose up -d --build`
3. `docker compose logs -f backend`

**Verification:**
- Worker exists: `docker compose exec backend ls dist/workers/thumbnailWorker.js`
- Logs show: `🚀 Parallel Thumbnail Queue initialized`
- CPU usage: 80-100% during uploads

**Rollback:**
- `git checkout <previous-commit>`
- `docker compose up -d --build`

That's it! Docker makes deployment super simple.
