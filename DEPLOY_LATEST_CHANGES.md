# Deploying Latest Changes to VPS

## Quick Deployment Guide

### Prerequisites
- SSH access to your VPS
- Git repository is set up on VPS
- Docker and docker-compose installed

### Step-by-Step Deployment

#### 1. Commit and Push Your Changes

```bash
# On your local machine
git add .
git commit -m "Add pagination, search, and mobile fixes"
git push origin main
```

#### 2. Connect to Your VPS

```bash
ssh root@yarrowweddings.com
# or
ssh root@<your-vps-ip>
```

#### 3. Navigate to Project Directory

```bash
cd /root/PhotoPortal
```

#### 4. Run the Deployment Script

```bash
# Use the existing deployment script
./deploy-production.sh
```

This script will:
- Pull latest changes from git
- Stop existing containers
- Rebuild Docker images with new code
- Start containers
- Run database migrations
- Check service health

#### 5. Monitor the Deployment

```bash
# Watch logs in real-time
docker-compose logs -f

# Check container status
docker-compose ps

# Check specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

#### 6. Verify Deployment

```bash
# Test the application
curl https://yarrowweddings.com/health
curl https://yarrowweddings.com/api/health

# Or visit in browser
# https://yarrowweddings.com
```

---

## Alternative: Manual Deployment

If you prefer manual control:

```bash
# 1. Connect to VPS
ssh root@yarrowweddings.com

# 2. Navigate to project
cd /root/PhotoPortal

# 3. Create backup (recommended)
./backup.sh

# 4. Pull latest code
git pull origin main

# 5. Rebuild and restart
docker-compose down
docker-compose up -d --build

# 6. Check status
docker-compose ps
docker-compose logs -f
```

---

## What's Being Deployed

### New Features
1. **Pagination** - Gallery photos now use pagination instead of infinite scroll
2. **Search** - Search functionality on manage page
3. **Mobile Fixes** - Upload progress panel and header responsive on mobile
4. **Auto-refresh** - Manage page auto-refreshes after uploads complete
5. **Better Upload UI** - Expandable file lists showing all uploads

### Files Changed
- `frontend/src/app/gallery/[id]/page.tsx` - Pagination implementation
- `frontend/src/app/galleries/[id]/manage/page.tsx` - Search and auto-refresh
- `frontend/components/ui/upload-progress-panel.tsx` - Mobile fixes and expandable lists

---

## Troubleshooting

### If Deployment Fails

```bash
# Check what went wrong
docker-compose logs --tail=100

# Rollback to previous version
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
docker-compose down
docker-compose up -d --build
```

### If Containers Won't Start

```bash
# Check Docker status
docker ps -a

# Check system resources
df -h  # Disk space
free -h  # Memory

# Clean up Docker
docker system prune -f

# Try again
docker-compose up -d --build
```

### If Frontend Build Fails

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild just frontend
docker-compose up -d --build frontend

# Or rebuild from scratch
docker-compose down
docker rmi photoportal-frontend
docker-compose up -d --build
```

### If Backend Won't Connect

```bash
# Check backend logs
docker-compose logs backend

# Check database connection
docker-compose exec backend npm run migrate

# Restart backend
docker-compose restart backend
```

---

## Post-Deployment Checklist

- [ ] Application loads at https://yarrowweddings.com
- [ ] Gallery pagination works (50 photos per page)
- [ ] Search works on manage page
- [ ] Upload progress panel visible on mobile
- [ ] Photos auto-appear after upload completes
- [ ] No errors in logs: `docker-compose logs --tail=100`

---

## Quick Commands Reference

```bash
# Connect to VPS
ssh root@yarrowweddings.com

# Navigate to project
cd /root/PhotoPortal

# Deploy
./deploy-production.sh

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Full rebuild
docker-compose down && docker-compose up -d --build

# Create backup
./backup.sh

# Check disk space
df -h

# Check memory
free -h
```

---

## Monitoring After Deployment

### Check Application Health

```bash
# From VPS
curl http://localhost:3000/health
curl http://localhost:5000/api/health

# From outside
curl https://yarrowweddings.com/health
curl https://yarrowweddings.com/api/health
```

### Monitor Logs

```bash
# All services
docker-compose logs -f

# Just errors
docker-compose logs -f | grep -i error

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Check Performance

```bash
# Container stats
docker stats

# System resources
htop

# Disk usage
df -h
du -sh /root/PhotoPortal/*
```

---

## Rollback Procedure

If something goes wrong:

```bash
# 1. Check git history
git log --oneline -10

# 2. Rollback to previous version
git reset --hard <previous-commit-hash>

# 3. Rebuild
docker-compose down
docker-compose up -d --build

# 4. Or restore from backup
./backup.sh  # If you need to restore
```

---

## Need Help?

### Check Logs First
```bash
docker-compose logs --tail=100
```

### Common Issues
- **Build fails**: Check disk space with `df -h`
- **Container won't start**: Check logs with `docker-compose logs <service>`
- **Out of memory**: Restart with `docker-compose restart`
- **Database issues**: Check with `docker-compose logs postgres`

### Get Support
- Check VPS_OPERATIONS_GUIDE.md for detailed troubleshooting
- Review DEPLOYMENT_GUIDE.md for comprehensive deployment info
- Check application logs: `docker-compose logs -f`

---

## Estimated Deployment Time

- **Pull code**: 10-30 seconds
- **Build images**: 3-5 minutes
- **Start containers**: 30-60 seconds
- **Total**: ~5-7 minutes

---

## Success Indicators

✅ All containers running: `docker-compose ps` shows "Up"
✅ No errors in logs: `docker-compose logs --tail=100`
✅ Application accessible: https://yarrowweddings.com loads
✅ API responding: https://yarrowweddings.com/api/health returns 200
✅ New features working: Pagination, search, mobile layout

---

**Ready to deploy?** Just run:

```bash
ssh root@yarrowweddings.com
cd /root/PhotoPortal
./deploy-production.sh
```

That's it! 🚀
