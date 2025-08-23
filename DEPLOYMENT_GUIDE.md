# Photo Portal Deployment Guide (Backblaze B2)

This document provides comprehensive instructions for deploying the Photo Portal application using Backblaze B2 for cloud storage. It covers deployment to various environments including development, staging, and production.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database access
- Backblaze B2 account and bucket
- Domain name (for production)
- SSL certificate (for production)

### Environment Setup
1. Clone the repository
2. Install dependencies for both frontend and backend
3. Configure environment variables
4. Set up the database
5. Deploy to your chosen platform

## 🔧 Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/photo_portal"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=5000
NODE_ENV=development

# File Storage Configuration (Backblaze B2)
BACKBLAZE_APPLICATION_KEY_ID="your-b2-key-id"
BACKBLAZE_APPLICATION_KEY="your-b2-application-key"
BACKBLAZE_BUCKET_ID="your-b2-bucket-id"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# Optional: Email service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Optional: Analytics
GOOGLE_ANALYTICS_ID="GA_MEASUREMENT_ID"
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:5000/api"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="GA_MEASUREMENT_ID"

# Optional: Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES="true"
```

### Production Environment Variables

For production, use more secure values:

```bash
# Backend Production
NODE_ENV=production
PORT=5000
JWT_SECRET="very-long-random-string-256-bits-minimum"
DATABASE_URL="postgresql://prod_user:prod_password@prod_host:5432/photo_portal_prod"

# Frontend Production
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
```

## 🗄️ Database Setup

### Local Development

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE photo_portal;
   CREATE USER photo_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE photo_portal TO photo_user;
   \q
   ```

3. **Run Migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

### Production Database

1. **Cloud Database Options**:
   - **DigitalOcean Managed Databases**: Simple setup with built-in backups
   - **Heroku Postgres**: Easy deployment with automatic backups
   - **Supabase**: Open-source alternative with generous free tier
   - **Railway**: Integrated with the platform for easy setup
   - **PlanetScale**: MySQL-compatible with branching

3. **Connection String Format**:
   ```
   postgresql://username:password@host:port/database
   ```

## ☁️ Cloud Storage Setup (Backblaze B2)

### Backblaze B2 Configuration

1. **Create B2 Account and Bucket**:
   - Sign up at [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)
   - Create a new bucket in the B2 Console
   - Note your Account ID and Bucket Name

2. **Create Application Key**:
   - Go to B2 Console → Application Keys
   - Click "Add a New Application Key"
   - Set Key Name (e.g., "Photo-Portal-Production")
   - Choose "Allow access to Bucket(s)" and select your bucket
   - Copy the `keyID` and `applicationKey` - you'll need these for environment variables

3. **Configure CORS**:
   - In B2 Console, go to your bucket settings
   - Navigate to CORS Rules
   - Add a new CORS rule:
   ```json
   [
     {
       "corsRuleName": "PhotoPortalCORS",
       "allowedOrigins": ["https://yourdomain.com"],
       "allowedHeaders": ["*"],
       "allowedOperations": ["b2_download_file_by_id", "b2_download_file_by_name", "b2_list_file_names", "b2_upload_file"],
       "exposeHeaders": ["x-bz-content-sha1"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

4. **Set Bucket to Public (for thumbnails)**:
   - In your bucket settings, enable "Files are public" for public read access to thumbnails
   - Note: You can use B2's built-in CDN by enabling "Backblaze B2 CDN" in bucket settings

5. **Get Your Bucket ID**:
   - The Bucket ID can be found in your bucket settings
   - You'll need this for the `BACKBLAZE_BUCKET_ID` environment variable

## 🚀 Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. **Connect Repository**:
   - Push code to GitHub/GitLab
   - Connect repository to Vercel
   - Configure build settings

2. **Build Configuration**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

3. **Environment Variables**:
   - Add all `NEXT_PUBLIC_*` variables in Vercel dashboard

#### Backend (Railway)
1. **Deploy to Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Environment Variables**:
   - Add all backend environment variables in Railway dashboard

### Option 2: DigitalOcean App Platform

1. **Create App**:
   - Connect GitHub repository
   - Select Node.js for backend
   - Select Next.js for frontend

2. **Configure Services**:
   - Backend: Node.js service
   - Frontend: Next.js service
   - Database: Managed PostgreSQL

### Option 3: VPS Deployment (Advanced)

#### Backend (VPS with PM2)
1. **Choose a VPS Provider**:
   - DigitalOcean Droplet
   - Linode
   - Vultr
   - Hetzner Cloud

2. **Setup VPS (Ubuntu/Debian)**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install Nginx (for reverse proxy)
   sudo apt install nginx
   ```

3. **Deploy Backend Application**:
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/photo-portal.git
   cd photo-portal/backend

   # Install dependencies
   npm install

   # Build application
   npm run build

   # Start with PM2
   pm2 start dist/server.js --name "photo-portal-api"
   pm2 startup
   pm2 save
   ```

4. **Configure Nginx (Reverse Proxy)**:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

#### Frontend (Static Hosting)
1. **Build and Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Choose Static Hosting**:
   - **Vercel**: Connect GitHub repo, automatic deployments
   - **Netlify**: Drag & drop build folder or connect repo
   - **DigitalOcean App Platform**: Full-stack deployment
   - **Traditional VPS**: Serve with Nginx from `/var/www/html`

### Option 4: Docker Deployment

1. **Create Dockerfile** (backend):
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   EXPOSE 5000

   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "5000:5000"
       environment:
         - DATABASE_URL=postgresql://user:pass@db:5432/photo_portal
       depends_on:
         - db
     
     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_API_URL=http://localhost:5000/api
     
     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=photo_portal
         - POSTGRES_USER=user
         - POSTGRES_PASSWORD=pass
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

3. **Deploy with Docker**:
   ```bash
   docker-compose up -d
   ```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Let's Encrypt (Free)**:
   ```bash
   # Install Certbot
   sudo apt install certbot

   # Get certificate
   sudo certbot certonly --standalone -d yourdomain.com

   # Auto-renewal
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

2. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Environment Security

1. **Secrets Management**:
   - Use environment variables (never commit secrets)
   - Consider using secure secret management tools like HashiCorp Vault
   - Rotate secrets regularly

2. **Database Security**:
   - Use strong passwords
   - Restrict network access
   - Enable SSL connections
   - Regular backups

## 📊 Monitoring and Logging

### Application Monitoring

1. **PM2 Monitoring**:
   ```bash
   # Monitor processes
   pm2 monit

   # View logs
   pm2 logs photo-portal-api

   # Restart on failure
   pm2 start dist/server.js --name "photo-portal-api" --max-memory-restart 300M
   ```

2. **Health Checks**:
   ```bash
   # Add to your application
   curl https://yourdomain.com/api/system-status
   ```

### Logging

1. **Winston Logger** (recommended):
   ```typescript
   import winston from 'winston';

   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });

   if (process.env.NODE_ENV !== 'production') {
     logger.add(new winston.transports.Console({
       format: winston.format.simple()
     }));
   }
   ```

2. **Log Rotation**:
   ```bash
   # Install logrotate
   sudo apt install logrotate

   # Configure rotation
   sudo nano /etc/logrotate.d/photo-portal
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd backend
          npm ci
          
      - name: Build
        run: |
          cd backend
          npm run build
          
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          cd backend
          railway up

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection**:
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check if database exists
   psql $DATABASE_URL -l
   ```

2. **File Upload Issues**:
   ```bash
   # Check B2 connection (if using b2 CLI)
   b2 authorize-account

   # List files in bucket
   b2 list-file-names your-bucket-id

   # Test upload (if using b2 CLI)
   b2 upload-file your-bucket-id test.jpg test.jpg
   ```

   **Common B2 Issues**:
   - Verify your `BACKBLAZE_APPLICATION_KEY_ID` and `BACKBLAZE_APPLICATION_KEY` are correct
   - Ensure your application key has the right permissions for your bucket
   - Check that CORS is properly configured in B2 Console
   - Verify your bucket ID is correct in environment variables

3. **Performance Issues**:
   ```bash
   # Check memory usage
   free -h
   
   # Check disk space
   df -h
   
   # Check process status
   pm2 status
   ```

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm run dev

# Frontend
NODE_ENV=development npm run dev
```

## 📈 Performance Optimization

### Backend Optimization

1. **Database Indexing**:
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_photos_gallery_id ON photos(gallery_id);
   CREATE INDEX idx_galleries_photographer_id ON galleries(photographer_id);
   ```

2. **Connection Pooling**:
   ```typescript
   // Configure Prisma connection pool
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // Connection pool settings
     __internal: {
       engine: {
         connectionLimit: 20,
         pool: {
           min: 2,
           max: 10,
         },
       },
     },
   });
   ```

### Frontend Optimization

1. **Image Optimization**:
   ```typescript
   // Next.js Image component with optimization
   <Image
     src={photo.thumbnailUrl}
     alt={photo.filename}
     width={300}
     height={200}
     placeholder="blur"
     blurDataURL="data:image/jpeg;base64,..."
   />
   ```

2. **Code Splitting**:
   ```typescript
   // Dynamic imports for heavy components
   const PhotoLightbox = dynamic(() => import('./PhotoLightbox'), {
     loading: () => <div>Loading...</div>,
     ssr: false
   });
   ```

## 🔄 Backup and Recovery

### Database Backups

1. **Automated Backups**:
   ```bash
   # Create backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump $DATABASE_URL > backup_$DATE.sql
   
   # Add to crontab
   0 2 * * * /path/to/backup-script.sh
   ```

2. **B2 Backup Storage**:
   ```bash
   # Upload backups to B2 (if using b2 CLI)
   b2 upload-file your-backup-bucket-id backup_$DATE.sql backup_$DATE.sql

   # Or using curl with B2 API
   curl -H "Authorization: $B2_AUTH_TOKEN" \
        -F "file=@backup_$DATE.sql" \
        "https://pod-000-0000-00.backblaze.com/b2api/v2/b2_upload_file/$UPLOAD_URL"
   ```

### File Storage Backups

1. **B2 Cross-Bucket Backup**:
   - Create a separate backup bucket in B2
   - Use B2's built-in backup features or set up automated sync
   - Consider using B2's lifecycle rules for automatic backup management

2. **Regular Sync Checks**:
   ```bash
   # List files in primary bucket
   b2 list-file-names your-bucket-id

   # Compare with backup bucket
   b2 list-file-names your-backup-bucket-id

   # Use B2 sync (if available in your B2 client)
   b2 sync your-bucket-id your-backup-bucket-id
   ```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Backblaze B2 bucket and application key configured

### Deployment
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] Database connection verified
- [ ] File upload tested
- [ ] Authentication working

### Post-Deployment
- [ ] SSL certificate verified
- [ ] Performance monitoring enabled
- [ ] Backup system configured
- [ ] Error logging configured
- [ ] Health checks implemented

## 🆘 Support and Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Community
- [GitHub Issues](https://github.com/yourusername/photo-portal/issues)
- [Discord Community](https://discord.gg/your-community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/photo-portal)

### Monitoring Tools
- [Sentry](https://sentry.io/) - Error tracking
- [LogRocket](https://logrocket.com/) - Session replay
- [New Relic](https://newrelic.com/) - Performance monitoring
- [Datadog](https://www.datadoghq.com/) - Infrastructure monitoring