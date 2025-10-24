# 🐳 Docker Deployment Guide - Photo Gallery Platform

**Complete Docker setup with Docker Compose**

---

## 🎯 Why Docker?

✅ **Consistent Environment** - Works the same everywhere  
✅ **Easy Updates** - Just rebuild and restart  
✅ **Isolated Services** - Each service in its own container  
✅ **Simple Rollback** - Keep previous images  
✅ **Resource Control** - Limit CPU/memory per service  
✅ **One Command Deploy** - `docker-compose up -d`

---

## 📋 Prerequisites

### **What You Need:**
- Ubuntu 22.04 LTS server (Hostinger VPS)
- Docker & Docker Compose installed
- Domain name (optional but recommended)
- Backblaze B2 credentials

---

## 🚀 Quick Start (5 Minutes)

### **Step 1: Install Docker on Ubuntu**

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Enable Docker to start on boot
systemctl enable docker
systemctl start docker
```

### **Step 2: Clone Your Repository**

```bash
# Create app directory
mkdir -p /opt/photo-gallery
cd /opt/photo-gallery

# Clone your repo (or upload via FTP/SCP)
git clone https://github.com/your-username/your-repo.git .

# Or if uploading manually:
# Use FileZilla/WinSCP to upload your project files
```

### **Step 3: Configure Environment**

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Fill in your values:**

```env
# PostgreSQL Database
POSTGRES_USER=photo_user
POSTGRES_PASSWORD=your_secure_password_here_min_16_chars
POSTGRES_DB=photo_gallery

# Backblaze B2 Storage
AWS_ACCESS_KEY_ID=your_b2_key_id
AWS_SECRET_ACCESS_KEY=your_b2_secret_key
S3_BUCKET_NAME=your-bucket-name

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_very_long_random_secret_string_here

# API URL
NEXT_PUBLIC_API_URL=http://your-domain.com/api
# Or for testing: http://your-server-ip/api
```

**Generate secure JWT secret:**

```bash
openssl rand -hex 32
```

### **Step 4: Build and Start**

```bash
# Build all containers
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### **Step 5: Initialize Database**

```bash
# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Create first admin user
docker compose exec backend npm run create-admin

# Follow the prompts to create your admin account
```

### **Step 6: Test Your Deployment**

```bash
# Check if services are running
docker compose ps

# Should show all services as "Up" and "healthy"

# Test backend API
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:80

# Or open in browser:
# http://your-server-ip
```

---

## 🎛️ Docker Commands Cheat Sheet

### **Service Management:**

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Check service status
docker compose ps
```

### **Updates & Rebuilds:**

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend

# Remove old images
docker image prune -a
```

### **Database Operations:**

```bash
# Access PostgreSQL
docker compose exec postgres psql -U photo_user -d photo_gallery

# Backup database
docker compose exec postgres pg_dump -U photo_user photo_gallery > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U photo_user photo_gallery

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Reset database (CAUTION: Deletes all data)
docker compose exec backend npx prisma migrate reset --force
```

### **Container Shell Access:**

```bash
# Access backend container
docker compose exec backend sh

# Access frontend container
docker compose exec frontend sh

# Access database container
docker compose exec postgres sh
```

### **Monitoring:**

```bash
# View resource usage
docker stats

# View container logs
docker compose logs --tail=100 -f

# Check container health
docker compose ps
```

---

## 🔧 Configuration Files Explained

### **docker-compose.yml**
- Defines all services (postgres, backend, frontend, nginx)
- Sets up networking between containers
- Configures volumes for data persistence
- Defines health checks

### **backend/Dockerfile**
- Builds Node.js backend image
- Installs Sharp dependencies for image processing
- Runs Prisma migrations
- Exposes port 5000

### **frontend/Dockerfile**
- Builds Next.js frontend image
- Creates optimized production build
- Exposes port 3000

### **nginx/nginx.conf**
- Reverse proxy configuration
- Routes /api to backend
- Routes / to frontend
- Rate limiting for uploads

---

## 🌐 Production Setup with Domain

### **Step 1: Configure DNS**

Point your domain to your server IP:

```
Type    Name    Value           TTL
A       @       your-server-ip  14400
A       www     your-server-ip  14400
```

### **Step 2: Install SSL Certificate**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Stop nginx container temporarily
docker compose stop nginx

# Get SSL certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/

# Update nginx.conf to use SSL
nano nginx/nginx.conf
```

**Add SSL configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of your config
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Update docker-compose.yml to mount SSL certificates:**

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Add this line
```

**Restart nginx:**

```bash
docker compose up -d nginx
```

### **Step 3: Setup Auto-Renewal**

```bash
# Test renewal
certbot renew --dry-run

# Add to crontab
crontab -e

# Add this line (renew at 2 AM daily):
0 2 * * * certbot renew --quiet && docker compose restart nginx
```

---

## 📊 Monitoring & Logs

### **View Real-Time Logs:**

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100

# With timestamps
docker compose logs -f --timestamps
```

### **Resource Monitoring:**

```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Container details
docker compose ps
```

---

## 🔄 Backup & Restore

### **Automated Backup Script:**

```bash
# Create backup script
nano /opt/photo-gallery/backup.sh
```

**Add this content:**

```bash
#!/bin/bash
BACKUP_DIR="/opt/photo-gallery/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T postgres pg_dump -U photo_user photo_gallery | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup environment file
cp .env $BACKUP_DIR/env_$DATE.backup

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable and schedule:**

```bash
chmod +x /opt/photo-gallery/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/photo-gallery/backup.sh >> /opt/photo-gallery/backup.log 2>&1
```

### **Restore from Backup:**

```bash
# Stop services
docker compose down

# Restore database
gunzip -c backups/db_20250123_020000.sql.gz | docker compose exec -T postgres psql -U photo_user photo_gallery

# Start services
docker compose up -d
```

---

## 🚨 Troubleshooting

### **Services won't start:**

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### **Database connection failed:**

```bash
# Check if postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
docker compose exec postgres psql -U photo_user -d photo_gallery
```

### **Backend can't connect to database:**

```bash
# Make sure postgres is healthy first
docker compose ps

# Check backend logs
docker compose logs backend

# Restart backend
docker compose restart backend
```

### **Frontend can't reach backend:**

```bash
# Check NEXT_PUBLIC_API_URL in .env
cat .env | grep NEXT_PUBLIC_API_URL

# Rebuild frontend with correct URL
docker compose up -d --build frontend
```

### **Out of disk space:**

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## 🎯 Performance Optimization

### **Resource Limits:**

Add to docker-compose.yml:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '1'
        memory: 2G
```

### **Enable Logging Rotation:**

```yaml
backend:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

---

## 📈 Scaling

### **Run Multiple Backend Instances:**

```bash
# Scale backend to 2 instances
docker compose up -d --scale backend=2

# Nginx will automatically load balance
```

---

## ✅ Advantages of Docker Deployment

1. **Consistency** - Same environment everywhere
2. **Isolation** - Services don't interfere
3. **Easy Updates** - Just rebuild and restart
4. **Rollback** - Keep old images for quick rollback
5. **Portability** - Move to any server easily
6. **Resource Control** - Limit CPU/memory per service
7. **Health Checks** - Auto-restart unhealthy containers

---

## 🎉 You're Done!

Your photo gallery is now running in Docker!

**Access your app:**
- Frontend: http://your-domain.com
- API: http://your-domain.com/api
- Admin: http://your-domain.com/admin

**Useful commands:**
```bash
docker compose ps          # Check status
docker compose logs -f     # View logs
docker compose restart     # Restart all
docker compose down        # Stop all
docker compose up -d       # Start all
```

---

## 📞 Need Help?

Check logs first:
```bash
docker compose logs --tail=100 -f
```

Common issues are usually:
- Wrong environment variables in .env
- Database not ready (wait 30 seconds)
- Port conflicts (check with: netstat -tulpn)
