# 🚀 Hostinger Deployment Guide - Photo Gallery Platform

**Last Updated:** 2025-01-23  
**Platform:** Hostinger VPS/Cloud Hosting  
**Stack:** Node.js (Backend) + Next.js (Frontend) + PostgreSQL

---

## 📋 Prerequisites

### **What You Need:**
- [ ] Hostinger VPS or Cloud Hosting plan (recommended: VPS 2 or higher)
- [ ] Domain name (can be purchased from Hostinger)
- [ ] Backblaze B2 account with credentials
- [ ] SSH access to your server
- [ ] Basic terminal knowledge

### **Recommended Hostinger Plan:**
- **VPS 2 or higher**: 4 vCPU, 8GB RAM, 100GB NVMe
- **Why**: Handles Sharp image processing + concurrent uploads
- **Cost**: ~$12-20/month

---

## 🎯 Step-by-Step Deployment

## PART 1: Server Setup

### **Step 1: Access Your Hostinger VPS**

```bash
# Get your VPS IP from Hostinger panel
# SSH into your server
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y
```

### **Step 2: Install Required Software**

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Git
apt install -y git

# Install build tools (required for Sharp)
apt install -y build-essential libvips-dev
```

### **Step 3: Configure PostgreSQL**

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE photo_gallery;
CREATE USER photo_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE photo_gallery TO photo_user;
\q

# Enable PostgreSQL to start on boot
systemctl enable postgresql
systemctl start postgresql
```

### **Step 4: Create Application User**

```bash
# Create a non-root user for security
adduser photoapp
usermod -aG sudo photoapp

# Switch to the new user
su - photoapp
```

---

## PART 2: Deploy Backend

### **Step 5: Clone and Setup Backend**

```bash
# Create application directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository (or upload via FTP)
git clone https://github.com/your-username/your-repo.git photo-gallery
cd photo-gallery/backend

# Install dependencies
npm install

# Install PM2 globally if not already done
sudo npm install -g pm2
```

### **Step 6: Configure Backend Environment**

```bash
# Create production environment file
nano .env

# Add the following (replace with your actual values):
```

```env
# Database
DATABASE_URL="postgresql://photo_user:your_secure_password_here@localhost:5432/photo_gallery?schema=public"

# Backblaze B2 Storage
AWS_ACCESS_KEY_ID=your_b2_key_id
AWS_SECRET_ACCESS_KEY=your_b2_secret_key
S3_BUCKET_NAME=your-bucket-name

# JWT Secret (generate a random string)
JWT_SECRET=your_very_long_random_secret_string_here_min_32_chars

# Server Configuration
NODE_ENV=production
PORT=5000

# Optional: Rate Limiting
MAX_UPLOAD_SIZE=52428800
UPLOAD_RATE_LIMIT=100
```

**Generate JWT Secret:**
```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Step 7: Setup Database**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Create first admin user
npm run create-admin
# Follow the prompts to create your admin account
```

### **Step 8: Build and Start Backend**

```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start npm --name "photo-gallery-api" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs photo-gallery-api
```

---

## PART 3: Deploy Frontend

### **Step 9: Setup Frontend**

```bash
# Navigate to frontend directory
cd ~/apps/photo-gallery/frontend

# Install dependencies
npm install
```

### **Step 10: Configure Frontend Environment**

```bash
# Create production environment file
nano .env.production

# Add the following:
```

```env
# API URL (use your domain or IP)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api

# Or if using subdirectory:
# NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### **Step 11: Build and Start Frontend**

```bash
# Build Next.js application
npm run build

# Start with PM2
pm2 start npm --name "photo-gallery-web" -- start

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs photo-gallery-web
```

---

## PART 4: Configure Nginx

### **Step 12: Setup Nginx Reverse Proxy**

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/photo-gallery
```

**Add this configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your API subdomain

    client_max_body_size 100M;  # Allow large file uploads

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the configuration:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

---

## PART 5: SSL Certificate (HTTPS)

### **Step 13: Install SSL with Let's Encrypt**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates (replace with your domains)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## PART 6: Domain Configuration

### **Step 14: Configure DNS in Hostinger**

1. **Log into Hostinger Panel**
2. **Go to Domains → Manage**
3. **Click DNS/Nameservers**
4. **Add these A records:**

```
Type    Name    Value               TTL
A       @       your-vps-ip         14400
A       www     your-vps-ip         14400
A       api     your-vps-ip         14400
```

5. **Wait 5-30 minutes for DNS propagation**

---

## PART 7: Monitoring & Maintenance

### **Step 15: Setup Monitoring**

```bash
# View PM2 dashboard
pm2 monit

# View logs
pm2 logs photo-gallery-api
pm2 logs photo-gallery-web

# View all processes
pm2 list

# Restart services
pm2 restart photo-gallery-api
pm2 restart photo-gallery-web

# Stop services
pm2 stop photo-gallery-api
pm2 stop photo-gallery-web
```

### **Step 16: Setup Automatic Backups**

```bash
# Create backup script
nano ~/backup-database.sh
```

**Add this script:**

```bash
#!/bin/bash
BACKUP_DIR="/home/photoapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/photo_gallery_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD='your_secure_password_here' pg_dump -U photo_user -h localhost photo_gallery > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Make it executable and schedule:**

```bash
# Make executable
chmod +x ~/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/photoapp/backup-database.sh >> /home/photoapp/backup.log 2>&1
```

---

## 🔧 Useful Commands

### **Application Management:**

```bash
# Restart everything
pm2 restart all

# View logs in real-time
pm2 logs --lines 100

# Monitor resource usage
pm2 monit

# Check application status
pm2 status

# View detailed info
pm2 info photo-gallery-api
```

### **Database Management:**

```bash
# Connect to database
psql -U photo_user -d photo_gallery

# Backup database manually
pg_dump -U photo_user photo_gallery > backup.sql

# Restore database
psql -U photo_user photo_gallery < backup.sql
```

### **Nginx Management:**

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🚨 Troubleshooting

### **Backend won't start:**

```bash
# Check logs
pm2 logs photo-gallery-api --lines 50

# Common issues:
# 1. Database connection - check DATABASE_URL in .env
# 2. Port already in use - check: sudo lsof -i :5000
# 3. Missing dependencies - run: npm install
```

### **Frontend won't start:**

```bash
# Check logs
pm2 logs photo-gallery-web --lines 50

# Common issues:
# 1. Build failed - run: npm run build
# 2. API URL wrong - check .env.production
# 3. Port conflict - check: sudo lsof -i :3000
```

### **Can't upload photos:**

```bash
# Check Nginx upload size
sudo nano /etc/nginx/nginx.conf

# Add inside http block:
client_max_body_size 100M;

# Restart Nginx
sudo systemctl restart nginx
```

### **Database connection failed:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U photo_user -d photo_gallery

# If password fails, reset it:
sudo -u postgres psql
ALTER USER photo_user WITH PASSWORD 'new_password';
\q
```

---

## 📊 Performance Optimization

### **Enable Nginx Caching:**

```bash
sudo nano /etc/nginx/sites-available/photo-gallery
```

**Add before server blocks:**

```nginx
# Cache configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=photo_cache:10m max_size=1g inactive=60m use_temp_path=off;

# Then in location blocks, add:
location / {
    proxy_cache photo_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    # ... rest of proxy settings
}
```

### **Optimize PM2:**

```bash
# Set PM2 to use cluster mode for better performance
pm2 delete photo-gallery-api
pm2 start npm --name "photo-gallery-api" -i 2 -- start

# -i 2 means 2 instances (adjust based on CPU cores)
```

---

## 🔐 Security Checklist

- [ ] Changed default PostgreSQL password
- [ ] Generated strong JWT secret
- [ ] Enabled firewall (UFW)
- [ ] SSL certificate installed
- [ ] Disabled root SSH login
- [ ] Setup automatic security updates
- [ ] Configured fail2ban (optional)

### **Setup Firewall:**

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📱 Testing Your Deployment

### **1. Test Backend API:**

```bash
# Health check
curl https://api.yourdomain.com/api/health

# Or if no health endpoint:
curl https://api.yourdomain.com/api/galleries
```

### **2. Test Frontend:**

```bash
# Open in browser
https://yourdomain.com

# Should see your photo gallery homepage
```

### **3. Test Upload:**

1. Log into admin panel
2. Create a gallery
3. Upload a test photo
4. Verify thumbnail generation
5. Test download

---

## 🎉 Deployment Complete!

Your photo gallery is now live on Hostinger!

### **Access Points:**
- **Frontend**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin

### **Next Steps:**
1. Create your first gallery
2. Upload test photos
3. Setup Cloudflare CDN (see DEPLOYMENT_READINESS_REPORT.md)
4. Configure monitoring alerts
5. Test backup restoration

---

## 📞 Support Resources

- **Hostinger Support**: https://www.hostinger.com/support
- **PM2 Docs**: https://pm2.keymetrics.io/docs/
- **Nginx Docs**: https://nginx.org/en/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## 🔄 Updating Your Application

```bash
# Navigate to app directory
cd ~/apps/photo-gallery

# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart photo-gallery-api

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart photo-gallery-web

# Check everything is running
pm2 status
```

---

**Need help?** Check the logs first:
```bash
pm2 logs --lines 100
sudo tail -f /var/log/nginx/error.log
```

Good luck with your deployment! 🚀
