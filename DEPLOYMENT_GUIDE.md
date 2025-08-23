# Deployment Guide

This document provides comprehensive instructions for deploying the Photo Portal application to various environments, including development, staging, and production.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database access
- Cloud storage account (AWS S3 or Backblaze B2)
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

# File Storage Configuration
# AWS S3 (Primary)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-photo-portal-bucket"

# Backblaze B2 (Alternative/Backup)
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
   - **AWS RDS**: Managed PostgreSQL service
   - **DigitalOcean Managed Databases**: Simple setup
   - **Heroku Postgres**: Easy deployment
   - **Supabase**: Open-source alternative

2. **AWS RDS Setup**:
   ```bash
   # Create RDS instance
   aws rds create-db-instance \
     --db-instance-identifier photo-portal-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password your-password \
     --allocated-storage 20
   ```

3. **Connection String Format**:
   ```
   postgresql://username:password@host:port/database
   ```

## ☁️ Cloud Storage Setup

### AWS S3 Configuration

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://your-photo-portal-bucket
   ```

2. **Configure CORS**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
       "AllowedOrigins": ["https://yourdomain.com"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Bucket Policy** (for public read access to thumbnails):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket/*"
       }
     ]
   }
   ```

### Backblaze B2 Configuration

1. **Create Application Key**:
   - Go to B2 Console → Application Keys
   - Create new application key with bucket access

2. **Configure CORS** (similar to S3)

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

### Option 3: AWS (Advanced)

#### Backend (EC2 + Load Balancer)
1. **Launch EC2 Instance**:
   ```bash
   # Launch Ubuntu instance
   aws ec2 run-instances \
     --image-id ami-0c02fb55956c7d316 \
     --instance-type t3.micro \
     --key-name your-key-pair \
     --security-group-ids sg-xxxxxxxxx
   ```

2. **Install Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2
   ```

3. **Deploy Application**:
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

#### Frontend (S3 + CloudFront)
1. **Build and Deploy**:
   ```bash
   cd frontend
   npm run build
   aws s3 sync out/ s3://your-frontend-bucket
   ```

2. **Configure CloudFront**:
   - Create distribution
   - Set S3 bucket as origin
   - Configure custom domain and SSL

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
   - Consider using AWS Secrets Manager or similar
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
   # Check S3 permissions
   aws s3 ls s3://your-bucket
   
   # Test upload
   aws s3 cp test.jpg s3://your-bucket/
   ```

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

2. **S3 Backup Storage**:
   ```bash
   # Upload backups to S3
   aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
   ```

### File Storage Backups

1. **S3 Cross-Region Replication**:
   ```bash
   # Configure replication
   aws s3api put-bucket-replication \
     --bucket your-bucket \
     --replication-configuration file://replication.json
   ```

2. **Regular Sync Checks**:
   ```bash
   # Verify file integrity
   aws s3 sync s3://your-bucket s3://your-backup-bucket --dryrun
   ```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Cloud storage configured

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