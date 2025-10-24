# SSL/HTTPS Setup with Let's Encrypt

## Prerequisites
- Domain name pointing to your VPS IP
- Docker containers running
- Ports 80 and 443 open

## Option 1: Using Certbot (Recommended)

### 1. Install Certbot
```bash
sudo apt update
sudo apt install certbot -y
```

### 2. Stop Nginx temporarily
```bash
docker compose stop nginx
```

### 3. Generate SSL Certificate
```bash
# Replace with your domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# Certificates will be saved to: /etc/letsencrypt/live/yourdomain.com/
```

### 4. Create SSL directory and copy certificates
```bash
# Create SSL directory in your project
mkdir -p nginx/ssl

# Copy certificates (replace yourdomain.com)
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown $USER:$USER nginx/ssl/*
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### 5. Update nginx.conf
Replace the nginx/nginx.conf content with SSL configuration:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        client_max_body_size 100M;
        client_body_timeout 300s;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Backend API
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Upload endpoints
        location ~ ^/api/photos/upload {
            limit_req zone=upload_limit burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 600s;
            proxy_send_timeout 600s;
            proxy_read_timeout 600s;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
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
}
```

### 6. Update .env file
```bash
nano .env
```

Change the API URL to use HTTPS:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 7. Rebuild and restart
```bash
# Rebuild frontend with new API URL
docker compose build frontend

# Restart all services
docker compose up -d
```

### 8. Set up auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Create renewal script
sudo nano /etc/cron.d/certbot-renewal
```

Add this content:
```
0 3 * * * root certbot renew --quiet --deploy-hook "cd /home/youruser/photo-gallery && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/ && docker compose restart nginx"
```

## Option 2: Using Docker Certbot (Alternative)

### 1. Update docker-compose.yml
Add certbot service:

```yaml
  certbot:
    image: certbot/certbot
    container_name: photo-gallery-certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - ./nginx/certbot-webroot:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

### 2. Initial certificate generation
```bash
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

## Verification

### Test SSL Configuration
```bash
# Check certificate
curl -I https://yourdomain.com

# Test SSL rating (optional)
# Visit: https://www.ssllabs.com/ssltest/
```

### Check logs
```bash
docker compose logs nginx
```

## Troubleshooting

### Certificate not found
```bash
# Check certificate location
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Verify nginx can read certificates
docker compose exec nginx ls -la /etc/nginx/ssl/
```

### Port 443 not accessible
```bash
# Check firewall
sudo ufw status
sudo ufw allow 443/tcp

# Check nginx is listening
docker compose exec nginx netstat -tlnp | grep 443
```

### Certificate renewal fails
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Check renewal logs
sudo cat /var/log/letsencrypt/letsencrypt.log
```

## Security Best Practices

1. **Use strong SSL settings** (already in config above)
2. **Enable HSTS** (add to nginx config):
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

3. **Regular updates**
```bash
# Update certbot
sudo apt update && sudo apt upgrade certbot
```

4. **Monitor expiration**
```bash
# Check certificate expiration
sudo certbot certificates
```

---

**Your site should now be accessible via HTTPS!**
- https://yourdomain.com
- https://yourdomain.com/api
