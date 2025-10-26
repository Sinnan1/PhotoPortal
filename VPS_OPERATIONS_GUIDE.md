# VPS Operations Guide - Photo Gallery Application

Complete guide for managing your production VPS server.

---

## Table of Contents

1. [Connecting to Your VPS](#connecting-to-your-vps)
2. [Navigating the Server](#navigating-the-server)
3. [Managing Docker Containers](#managing-docker-containers)
4. [Deploying New Changes](#deploying-new-changes)
5. [Monitoring & Logs](#monitoring--logs)
6. [Backups & Recovery](#backups--recovery)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Tasks](#maintenance-tasks)
9. [Emergency Procedures](#emergency-procedures)
10. [Quick Reference](#quick-reference)

---

## Connecting to Your VPS

### SSH Connection

```bash
# Connect to your server
ssh root@yarrowweddings.com
# or
ssh root@<your-server-ip>

# If using SSH key
ssh -i ~/.ssh/your-key.pem root@yarrowweddings.com
```

### First Time Setup

```bash
# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y htop ncdu vim git curl wget
```

---

## Navigating the Server

### Directory Structure

```
/root/PhotoPortal/          # Main application directory
├── backend/                # Backend Node.js application
│   ├── src/               # Source code
│   ├── prisma/            # Database schema
│   └── Dockerfile         # Backend Docker image
├── frontend/              # Frontend Next.js application
│   ├── src/               # Source code
│   ├── components/        # React components
│   └── Dockerfile         # Frontend Docker image
├── nginx/                 # Nginx configuration
│   ├── nginx.conf         # Production config
│   └── ssl/              # SSL certificates
├── backups/              # Database backups
├── .env                  # Environment variables
├── docker-compose.yml    # Docker services configuration
└── backup.sh            # Backup script
```

### Essential Navigation Commands

```bash
# Go to project directory
cd /root/PhotoPortal

# List files
ls -lah

# Check disk usage
df -h

# Check directory size
du -sh *

# Find files
find . -name "*.log"

# Search in files
grep -r "error" logs/
```

---

## Managing Docker Containers

### Viewing Container Status

```bash
# List all containers
docker-compose ps

# List all Docker containers (including stopped)
docker ps -a

# View container resource usage
docker stats

# View container details
docker inspect photo-gallery-api
```

### Starting/Stopping Containers

```bash
# Start all containers
docker-compose up -d

# Stop all containers
docker-compose down

# Restart all containers
docker-compose restart

# Restart specific container
docker-compose restart backend
docker-compose restart frontend
docker-compose restart nginx

# Stop specific container
docker-compose stop backend

# Start specific container
docker-compose start backend
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# View last 100 lines
docker-compose logs --tail=100 backend

# Follow specific container logs
docker-compose logs -f backend
```

### Accessing Container Shell

```bash
# Access backend container
docker-compose exec backend sh

# Access database
docker-compose exec postgres psql -U photo_user photo_gallery

# Run commands in container
docker-compose exec backend npm run migrate
```

---

## Deploying New Changes

### Standard Deployment Process

```bash
# 1. Connect to server
ssh root@yarrowweddings.com

# 2. Navigate to project
cd /root/PhotoPortal

# 3. Create backup before deployment
./backup.sh

# 4. Pull latest code
git pull origin main

# 5. Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# 6. Run database migrations (if needed)
docker-compose exec backend npm run migrate

# 7. Check status
docker-compose ps

# 8. Monitor logs for errors
docker-compose logs -f
```

### Quick Deployment (No Rebuild)

```bash
# If only code changes, no dependency changes
cd /root/PhotoPortal
git pull origin main
docker-compose restart
```

### Deployment with Zero Downtime

```bash
# 1. Pull changes
git pull origin main

# 2. Build new images
docker-compose build

# 3. Restart services one by one
docker-compose up -d --no-deps backend
sleep 5
docker-compose up -d --no-deps frontend
sleep 5
docker-compose up -d --no-deps nginx
```

### Rolling Back Deployment

```bash
# 1. Check git history
git log --oneline -10

# 2. Revert to previous commit
git reset --hard <commit-hash>

# 3. Rebuild containers
docker-compose down
docker-compose up -d --build

# Or restore from backup (see Backups section)
```

---

## Monitoring & Logs

### Application Health

```bash
# Check if application is responding
curl http://localhost:3000/health
curl http://localhost:5000/api/health

# Check from outside
curl https://yarrowweddings.com/health
curl https://yarrowweddings.com/api/health
```

### System Resources

```bash
# Check CPU and memory usage
htop

# Check disk space
df -h

# Check disk usage by directory
du -sh /root/PhotoPortal/*

# Check memory usage
free -h

# Check running processes
ps aux | grep node
ps aux | grep nginx
```

### Log Files

```bash
# Application logs
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100

# Nginx access logs
docker-compose logs nginx | grep "GET"

# Nginx error logs
docker-compose logs nginx | grep "error"

# Backup logs
tail -f /var/log/photo-gallery-backup.log

# System logs
tail -f /var/log/syslog
```

### Real-time Monitoring

```bash
# Watch container stats
watch docker stats

# Monitor logs continuously
docker-compose logs -f | grep -i error

# Monitor specific endpoint
watch -n 5 'curl -s https://yarrowweddings.com/health'
```

---

## Backups & Recovery

### Manual Backup

```bash
# Run backup script
cd /root/PhotoPortal
./backup.sh

# Verify backup was created
ls -lh backups/

# Check backup size
du -sh backups/
```

### Automated Backups

```bash
# View cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Check if backup ran
cat /var/log/photo-gallery-backup.log

# Test backup script
./backup.sh
```

### Restoring from Backup

```bash
# 1. List available backups
ls -lh backups/

# 2. Stop application
docker-compose down

# 3. Restore database
gunzip backups/database_YYYYMMDD_HHMMSS.sql.gz
docker-compose up -d postgres
sleep 10
cat backups/database_YYYYMMDD_HHMMSS.sql | docker-compose exec -T postgres psql -U photo_user photo_gallery

# 4. Restore environment files (if needed)
cp backups/env_YYYYMMDD_HHMMSS.backup .env

# 5. Restart application
docker-compose up -d

# 6. Verify
docker-compose ps
docker-compose logs -f
```

### Hostinger VPS Snapshots

```bash
# Snapshots are managed through Hostinger panel
# To restore from snapshot:
# 1. Log into Hostinger
# 2. Go to VPS → Snapshots
# 3. Select snapshot
# 4. Click "Restore"
# 5. Wait for restoration (5-15 minutes)
# 6. Reconnect via SSH
```

### Downloading Backups Locally

```bash
# From your local machine
scp root@yarrowweddings.com:/root/PhotoPortal/backups/database_*.sql.gz ~/Downloads/

# Or use rsync
rsync -avz root@yarrowweddings.com:/root/PhotoPortal/backups/ ~/local-backups/
```

---

## Troubleshooting

### Application Not Responding

```bash
# 1. Check if containers are running
docker-compose ps

# 2. Check logs for errors
docker-compose logs --tail=100

# 3. Check system resources
htop
df -h

# 4. Restart containers
docker-compose restart

# 5. If still not working, rebuild
docker-compose down
docker-compose up -d --build
```

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U photo_user photo_gallery -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

### Upload Issues

```bash
# Check backend logs
docker-compose logs backend | grep -i upload

# Check disk space
df -h

# Check B2 credentials
docker-compose exec backend printenv | grep AWS

# Test B2 connection
docker-compose exec backend node test-b2-connection.js
```

### High Memory Usage

```bash
# Check memory usage
free -h
docker stats

# Restart containers to free memory
docker-compose restart

# Clear Docker cache
docker system prune -f
```

### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Cloudflare manages SSL automatically
# If issues, check Cloudflare dashboard → SSL/TLS
```

---

## Maintenance Tasks

### Weekly Tasks

```bash
# 1. Check application health
curl https://yarrowweddings.com/health

# 2. Review logs for errors
docker-compose logs --since 7d | grep -i error

# 3. Check disk space
df -h

# 4. Verify backups are running
ls -lh backups/ | tail -5

# 5. Check system updates
apt update
apt list --upgradable
```

### Monthly Tasks

```bash
# 1. Update system packages
apt update && apt upgrade -y

# 2. Clean up old Docker images
docker system prune -a -f

# 3. Review and clean old backups
cd /root/PhotoPortal/backups
ls -lh
# Delete backups older than 30 days manually if needed

# 4. Check SSL certificate
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# 5. Review Cloudflare analytics
# Log into Cloudflare dashboard

# 6. Check B2 storage usage
# Log into Backblaze dashboard
```

### Quarterly Tasks

```bash
# 1. Update Node.js dependencies
cd /root/PhotoPortal/backend
npm outdated
# Review and update package.json if needed

cd /root/PhotoPortal/frontend
npm outdated

# 2. Review security updates
docker-compose exec backend npm audit
docker-compose exec frontend npm audit

# 3. Test backup restoration
# Restore a backup to verify it works

# 4. Review and update documentation
```

---

## Emergency Procedures

### Application Down

```bash
# 1. Quick restart
docker-compose restart

# 2. If that doesn't work
docker-compose down
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. If still down, restore from snapshot
# Use Hostinger panel to restore latest snapshot
```

### Database Corruption

```bash
# 1. Stop application
docker-compose down

# 2. Restore from latest backup
gunzip backups/database_LATEST.sql.gz
docker-compose up -d postgres
sleep 10
cat backups/database_LATEST.sql | docker-compose exec -T postgres psql -U photo_user photo_gallery

# 3. Restart application
docker-compose up -d
```

### Disk Full

```bash
# 1. Check what's using space
du -sh /root/PhotoPortal/*
du -sh /var/lib/docker/*

# 2. Clean Docker
docker system prune -a -f

# 3. Clean old backups
cd /root/PhotoPortal/backups
rm database_OLD*.sql.gz

# 4. Clean logs
docker-compose logs --tail=0
```

### Server Compromised

```bash
# 1. Immediately restore from clean snapshot
# Use Hostinger panel

# 2. Change all passwords
# - Root password
# - Database password
# - JWT secret
# - Admin passwords

# 3. Review access logs
cat /var/log/auth.log | grep -i failed

# 4. Update security
apt update && apt upgrade -y

# 5. Review and tighten firewall rules
```

---

## Quick Reference

### Most Used Commands

```bash
# Connect to server
ssh root@yarrowweddings.com

# Navigate to project
cd /root/PhotoPortal

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Restart application
docker-compose restart

# Deploy changes
git pull && docker-compose up -d --build

# Create backup
./backup.sh

# Check disk space
df -h

# Check memory
free -h

# Monitor resources
htop
```

### Important File Locations

```
Application:     /root/PhotoPortal
Backups:         /root/PhotoPortal/backups
Logs:            docker-compose logs
Environment:     /root/PhotoPortal/.env
Nginx Config:    /root/PhotoPortal/nginx/nginx.conf
SSL Certs:       /root/PhotoPortal/nginx/ssl/
Backup Log:      /var/log/photo-gallery-backup.log
```

### Important URLs

```
Application:     https://yarrowweddings.com
Admin Panel:     https://yarrowweddings.com/admin
API Health:      https://yarrowweddings.com/api/health
CDN:             https://photos.yarrowweddings.com
Cloudflare:      https://dash.cloudflare.com
Hostinger:       https://hpanel.hostinger.com
Backblaze B2:    https://secure.backblaze.com
```

### Emergency Contacts

```
Hosting:         Hostinger Support
Domain:          Your domain registrar
CDN:             Cloudflare Support
Storage:         Backblaze Support
Developer:       [Your contact]
```

---

## Best Practices

### Before Making Changes

1. ✅ Create a backup
2. ✅ Test changes locally first
3. ✅ Review what will change
4. ✅ Have a rollback plan
5. ✅ Monitor after deployment

### Security

1. ✅ Keep system updated
2. ✅ Use strong passwords
3. ✅ Don't commit secrets to git
4. ✅ Review logs regularly
5. ✅ Enable automatic backups

### Performance

1. ✅ Monitor resource usage
2. ✅ Clean up old Docker images
3. ✅ Optimize database queries
4. ✅ Use CDN for images
5. ✅ Enable caching

---

## Getting Help

### Check Logs First

```bash
# Application errors
docker-compose logs backend --tail=100

# System errors
tail -f /var/log/syslog

# Nginx errors
docker-compose logs nginx | grep error
```

### Common Issues

- **Can't connect**: Check if containers are running
- **Slow performance**: Check system resources
- **Upload fails**: Check B2 credentials and disk space
- **Database errors**: Check database logs and connections

### Support Resources

- Application logs: `docker-compose logs`
- System logs: `/var/log/syslog`
- Backup logs: `/var/log/photo-gallery-backup.log`
- Docker docs: https://docs.docker.com
- Nginx docs: https://nginx.org/en/docs/

---

## Appendix

### Useful Aliases

Add to `~/.bashrc`:

```bash
alias dc='docker-compose'
alias dps='docker-compose ps'
alias dlogs='docker-compose logs -f'
alias dre='docker-compose restart'
alias app='cd /root/PhotoPortal'
```

Then run: `source ~/.bashrc`

### Monitoring Script

Create `/root/monitor.sh`:

```bash
#!/bin/bash
echo "=== System Status ==="
echo "Disk: $(df -h / | awk 'NR==2 {print $5}')"
echo "Memory: $(free -h | awk 'NR==2 {print $3 "/" $2}')"
echo ""
echo "=== Docker Status ==="
cd /root/PhotoPortal
docker-compose ps
echo ""
echo "=== Recent Errors ==="
docker-compose logs --since 1h | grep -i error | tail -5
```

Make executable: `chmod +x /root/monitor.sh`

Run: `./monitor.sh`

---

**Last Updated**: October 2025
**Version**: 1.0
**Maintained by**: [Your Name]
