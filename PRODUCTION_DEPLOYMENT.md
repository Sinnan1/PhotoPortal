# Production Deployment Guide - yarrowweddings.cloud

## Prerequisites

1. VPS/Server with Docker and Docker Compose installed
2. Domain: `yarrowweddings.cloud` pointing to your server IP
3. SSL certificates (Let's Encrypt recommended)

## Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 2: SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot -y

# Stop any running services on port 80
sudo systemctl stop nginx 2>/dev/null || true
docker-compose down 2>/dev/null || true

# Get SSL certificate
sudo certbot certonly --standalone -d yarrowweddings.cloud -d www.yarrowweddings.cloud

# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yarrowweddings.cloud/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yarrowweddings.cloud/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

## Step 3: Clone Repository

```bash
# Clone your repository
git clone <your-repo-url>
cd <your-repo-name>
```

## Step 4: Configure Environment

```bash
# Copy and edit the .env file
cp .env.example .env
nano .env
```

Update these values in `.env`:
```env
# Database
POSTGRES_USER=photo_user
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=photo_gallery

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=<your-generated-secret>

# Backblaze B2
B2_KEY_ID=3957c3b77a0d
B2_APPLICATION_KEY=00430a29a8f582c1389f8ece2187d7802e4080152b
B2_BUCKET_NAME=photo-gallery-production
B2_BUCKET_ID=53d905d7cc330bd797aa001d

# AWS (for B2 compatibility)
AWS_ACCESS_KEY_ID=3957c3b77a0d
AWS_SECRET_ACCESS_KEY=00430a29a8f582c1389f8ece2187d7802e4080152b
AWS_REGION=us-west-004
S3_BUCKET_NAME=photo-gallery-production

# CORS
CORS_ORIGIN=https://yarrowweddings.cloud

# Admin Setup
FIRST_ADMIN_EMAIL=admin@yarrowweddings.com
FIRST_ADMIN_PASSWORD=<strong-password>
FIRST_ADMIN_NAME="Yarrow Admin"

# Frontend
NEXT_PUBLIC_API_URL=https://yarrowweddings.cloud/api
```

## Step 5: Deploy

```bash
# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Wait for services to be healthy
docker-compose ps
```

## Step 6: Initialize Database

```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Create first admin user
docker-compose exec backend npm run create-admin
```

## Step 7: Verify Deployment

1. Visit: https://yarrowweddings.cloud
2. Login at: https://yarrowweddings.cloud/admin/login
3. Use credentials from FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD

## SSL Certificate Renewal

Set up auto-renewal:

```bash
# Create renewal script
sudo nano /etc/cron.d/certbot-renewal

# Add this content:
0 0 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/yarrowweddings.cloud/*.pem /path/to/project/nginx/ssl/ && docker-compose -f /path/to/project/docker-compose.yml restart nginx"
```

## Backup Strategy

```bash
# Make backup script executable
chmod +x backup.sh

# Run manual backup
./backup.sh

# Set up automated backups (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/project/backup.sh
```

## Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Check service health
docker-compose ps
curl https://yarrowweddings.cloud/health
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend npm run migrate
```

## Troubleshooting

### Services won't start
```bash
docker-compose down
docker-compose up -d --build
docker-compose logs -f
```

### Database connection issues
```bash
docker-compose exec postgres psql -U photo_user -d photo_gallery
```

### SSL certificate issues
```bash
# Check certificate validity
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
```

### Clear and restart
```bash
docker-compose down -v
docker-compose up -d --build
```

## Security Checklist

- [ ] Strong database password set
- [ ] JWT secret is random and secure
- [ ] SSL certificates installed and working
- [ ] Firewall configured (allow 80, 443, 22 only)
- [ ] Admin password is strong
- [ ] Backups are automated
- [ ] Monitoring is set up
- [ ] Environment variables are not committed to git

## Support

For issues, check:
1. Docker logs: `docker-compose logs -f`
2. Service health: `docker-compose ps`
3. Nginx config: `docker-compose exec nginx nginx -t`
