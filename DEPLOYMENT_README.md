# Docker Deployment Files

This directory contains everything you need to deploy the Photo Gallery application using Docker on a fresh VPS.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `VPS_DOCKER_SETUP.md` | **START HERE** - Complete step-by-step deployment guide |
| `DEPLOYMENT_CHECKLIST.md` | Checklist to ensure nothing is missed |
| `SSL_SETUP.md` | Guide for setting up HTTPS with Let's Encrypt |
| `deploy.sh` | Automated deployment script |
| `docker-compose.yml` | Docker services configuration |
| `.env.example` | Environment variables template |
| `backend/Dockerfile` | Backend container configuration |
| `frontend/Dockerfile` | Frontend container configuration |
| `nginx/nginx.conf` | Nginx reverse proxy configuration |

## 🚀 Quick Start

### On your VPS:

1. **Install prerequisites**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

2. **Clone and configure**
```bash
git clone <your-repo-url> photo-gallery
cd photo-gallery
cp .env.example .env
nano .env  # Fill in your values
```

3. **Deploy**
```bash
chmod +x deploy.sh
./deploy.sh
```

That's it! Your application will be running.

## 📋 What Gets Deployed

The Docker setup includes:

- **PostgreSQL 16** - Database
- **Backend API** - Node.js/Express server
- **Frontend** - Next.js web application
- **Nginx** - Reverse proxy and load balancer

All services are connected via a private Docker network and managed as a single unit.

## 🔧 Configuration

### Required Environment Variables

Edit `.env` file with these values:

```env
# Database
POSTGRES_PASSWORD=<strong-password>

# Storage (Backblaze B2)
AWS_ACCESS_KEY_ID=<your-b2-key>
AWS_SECRET_ACCESS_KEY=<your-b2-secret>
S3_BUCKET_NAME=<your-bucket>

# Security
JWT_SECRET=<random-32-char-string>

# API URL
NEXT_PUBLIC_API_URL=http://your-vps-ip/api
```

Generate secure values:
```bash
openssl rand -hex 32        # For JWT_SECRET
openssl rand -base64 32     # For POSTGRES_PASSWORD
```

## 📊 Service Ports

| Service | Internal Port | External Port | Access |
|---------|--------------|---------------|--------|
| Nginx | 80, 443 | 80, 443 | Public |
| Frontend | 3000 | - | Via Nginx |
| Backend | 5000 | - | Via Nginx |
| PostgreSQL | 5432 | - | Internal only |

## 🛠️ Common Commands

```bash
# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update application
git pull
docker compose build
docker compose up -d

# Backup database
docker compose exec postgres pg_dump -U photo_user photo_gallery > backup.sql

# Access database
docker compose exec postgres psql -U photo_user -d photo_gallery
```

## 🔒 Security

### Firewall Setup
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### SSL/HTTPS
See `SSL_SETUP.md` for detailed instructions on setting up HTTPS with Let's Encrypt.

## 📈 Monitoring

### Check service health
```bash
# All services
docker compose ps

# Specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Resource usage
docker stats
```

### Health endpoints
```bash
curl http://localhost/api/health
curl http://localhost/health
```

## 🐛 Troubleshooting

### Services won't start
```bash
docker compose logs
docker compose down
docker compose up -d
```

### Database issues
```bash
docker compose logs postgres
docker compose exec postgres psql -U photo_user -d photo_gallery -c "SELECT 1;"
```

### Frontend can't reach backend
Check `NEXT_PUBLIC_API_URL` in `.env` and rebuild:
```bash
docker compose build frontend
docker compose up -d frontend
```

### Out of disk space
```bash
docker system prune -a --volumes
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🆘 Getting Help

1. Check the logs: `docker compose logs -f`
2. Review `VPS_DOCKER_SETUP.md` for detailed steps
3. Verify `.env` configuration
4. Check firewall settings
5. Ensure ports aren't in use: `sudo netstat -tulpn | grep -E ':(80|443|3000|5000|5432)'`

## ✅ Success Checklist

Your deployment is successful when:

- [ ] All containers are running (`docker compose ps`)
- [ ] Frontend accessible at http://your-ip
- [ ] API health check returns 200: http://your-ip/api/health
- [ ] Admin login works
- [ ] Can create galleries
- [ ] Can upload photos
- [ ] Thumbnails generate correctly
- [ ] No errors in logs

---

**Ready to deploy?** Start with `VPS_DOCKER_SETUP.md` 🚀
