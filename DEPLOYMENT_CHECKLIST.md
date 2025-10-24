# Docker Deployment Checklist

Use this checklist to ensure a smooth deployment on your fresh VPS.

## Pre-Deployment

- [ ] VPS is accessible via SSH
- [ ] Domain name configured (optional, can use IP)
- [ ] Backblaze B2 bucket created
- [ ] B2 application key generated

## VPS Setup

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed
- [ ] User added to docker group
- [ ] Firewall configured (ports 22, 80, 443)

## Application Setup

- [ ] Repository cloned to VPS
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables filled in:
  - [ ] POSTGRES_PASSWORD (strong password)
  - [ ] JWT_SECRET (random 32+ character string)
  - [ ] AWS_ACCESS_KEY_ID (B2 key ID)
  - [ ] AWS_SECRET_ACCESS_KEY (B2 secret key)
  - [ ] S3_BUCKET_NAME (B2 bucket name)
  - [ ] NEXT_PUBLIC_API_URL (your domain or IP)

## Build & Deploy

- [ ] `docker compose build` completed successfully
- [ ] `docker compose up -d` started all services
- [ ] All containers running: `docker compose ps`
- [ ] Database migrations applied: `docker compose exec backend npx prisma migrate deploy`
- [ ] First admin user created: `docker compose exec backend npm run create-admin`

## Verification

- [ ] Frontend accessible: http://your-ip
- [ ] API health check: http://your-ip/api/health
- [ ] Admin login works: http://your-ip/admin/login
- [ ] Can upload photos
- [ ] Thumbnails generate correctly
- [ ] Photos display in gallery

## Optional (Recommended)

- [ ] SSL certificate installed (see SSL_SETUP.md)
- [ ] HTTPS working
- [ ] Auto-renewal configured
- [ ] Database backup script set up
- [ ] Monitoring configured

## Post-Deployment

- [ ] Test all major features
- [ ] Create test gallery
- [ ] Upload test photos
- [ ] Verify client access
- [ ] Check logs for errors: `docker compose logs`

## Quick Commands Reference

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs backend
docker compose logs frontend

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update application
git pull
docker compose build
docker compose up -d

# Backup database
docker compose exec postgres pg_dump -U photo_user photo_gallery > backup-$(date +%Y%m%d).sql

# Check disk space
df -h
docker system df
```

## Troubleshooting Checklist

If something doesn't work:

1. [ ] Check logs: `docker compose logs`
2. [ ] Verify all containers running: `docker compose ps`
3. [ ] Check .env file has correct values
4. [ ] Verify ports not in use: `sudo netstat -tulpn | grep -E ':(80|443|3000|5000|5432)'`
5. [ ] Check firewall allows traffic
6. [ ] Verify B2 credentials are correct
7. [ ] Check database connection: `docker compose exec postgres psql -U photo_user -d photo_gallery -c "SELECT 1;"`

## Success Criteria

Your deployment is successful when:

✅ All containers are running
✅ You can log in as admin
✅ You can create a gallery
✅ You can upload photos
✅ Thumbnails are generated
✅ Photos are viewable
✅ No errors in logs

---

**Need help?** Check VPS_DOCKER_SETUP.md for detailed instructions.
