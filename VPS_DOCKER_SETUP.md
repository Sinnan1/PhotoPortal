# Fresh VPS Docker Deployment Guide

## Prerequisites on Your VPS

1. **Install Docker and Docker Compose**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (logout/login after this)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

2. **Install Git**
```bash
sudo apt install git -y
```

## Deployment Steps

### 1. Clone Your Repository
```bash
cd ~
git clone <your-repo-url> photo-gallery
cd photo-gallery
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

**Required values in .env:**
```env
# Database (use strong passwords!)
POSTGRES_USER=photo_user
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=photo_gallery

# Backblaze B2 Storage
AWS_ACCESS_KEY_ID=<your-b2-key-id>
AWS_SECRET_ACCESS_KEY=<your-b2-secret-key>
S3_BUCKET_NAME=<your-bucket-name>

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=<generate-random-string>

# API URL (use your domain or VPS IP)
NEXT_PUBLIC_API_URL=http://your-vps-ip/api
# Or for domain: https://yourdomain.com/api
```

**Generate secure values:**
```bash
# Generate JWT secret
openssl rand -hex 32

# Generate database password
openssl rand -base64 32
```

### 3. Build and Start Services
```bash
# Build images (first time only, or after code changes)
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### 4. Initialize Database
```bash
# Run Prisma migrations
docker compose exec backend npx prisma migrate deploy

# Create first admin user
docker compose exec backend npm run create-admin
```

Follow the prompts to create your admin account.

### 5. Verify Deployment
```bash
# Check logs
docker compose logs -f

# Check specific service
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Check health
curl http://localhost/api/health
curl http://localhost
```

## Access Your Application

- **Web Interface:** http://your-vps-ip
- **API:** http://your-vps-ip/api
- **Admin Panel:** http://your-vps-ip/admin/login

## Common Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Stop and remove volumes (CAUTION: deletes database!)
docker compose down -v

# Update application
git pull
docker compose build
docker compose up -d

# Backup database
docker compose exec postgres pg_dump -U photo_user photo_gallery > backup.sql

# Restore database
docker compose exec -T postgres psql -U photo_user photo_gallery < backup.sql
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000|5000|5432)'

# Restart Docker
sudo systemctl restart docker
docker compose up -d
```

### Database connection issues
```bash
# Check database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify connection
docker compose exec postgres psql -U photo_user -d photo_gallery -c "SELECT 1;"
```

### Frontend can't reach backend
```bash
# Check NEXT_PUBLIC_API_URL in .env
# Should be: http://your-vps-ip/api

# Rebuild frontend with new env
docker compose build frontend
docker compose up -d frontend
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -a --volumes

# Check disk usage
df -h
docker system df
```

## Security Recommendations

1. **Set up firewall**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Use SSL/TLS (recommended for production)**
   - Install Certbot for Let's Encrypt
   - Update nginx.conf with SSL configuration
   - See SSL_SETUP.md for details

3. **Change default passwords**
   - Use strong, unique passwords in .env
   - Never commit .env to git

4. **Regular updates**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

## Performance Tuning

### For production with high traffic:

1. **Increase worker connections** in nginx.conf
2. **Add Redis caching** (optional)
3. **Set up CDN** for static assets
4. **Monitor resources:**
```bash
docker stats
```

## Next Steps

1. Set up SSL certificate (Let's Encrypt)
2. Configure domain name
3. Set up automated backups
4. Configure monitoring/alerts
5. Set up CI/CD pipeline

---

**Need help?** Check the logs first:
```bash
docker compose logs -f
```
