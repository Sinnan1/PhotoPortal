#!/bin/bash

# Production Deployment Script for yarrowweddings.cloud
set -e

echo "🚀 Starting deployment for yarrowweddings.cloud..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
    echo "⚠️  Warning: SSL certificates not found in nginx/ssl/"
    echo "Please set up SSL certificates before deploying."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "📊 Service status:"
docker-compose ps

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend npm run migrate

# Check if admin exists, if not create one
echo "👤 Checking admin user..."
docker-compose exec -T backend npm run create-admin || echo "Admin user already exists or creation skipped"

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=50

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be available at:"
echo "   https://yarrowweddings.cloud"
echo ""
echo "🔐 Admin login:"
echo "   https://yarrowweddings.cloud/admin/login"
echo ""
echo "📊 Check status with: docker-compose ps"
echo "📝 View logs with: docker-compose logs -f"
