#!/bin/bash

# Photo Gallery Docker Deployment Script
# Run this on your VPS after cloning the repository

set -e

echo "=========================================="
echo "Photo Gallery Docker Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env file with your configuration before continuing!${NC}"
    echo ""
    echo "Required values:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - AWS_ACCESS_KEY_ID"
    echo "  - AWS_SECRET_ACCESS_KEY"
    echo "  - S3_BUCKET_NAME"
    echo "  - NEXT_PUBLIC_API_URL"
    echo ""
    echo "Generate secrets with:"
    echo "  JWT_SECRET: openssl rand -hex 32"
    echo "  POSTGRES_PASSWORD: openssl rand -base64 32"
    echo ""
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Install Docker Compose:"
    echo "  sudo apt install docker-compose-plugin -y"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Ask for confirmation
echo "This script will:"
echo "  1. Build Docker images"
echo "  2. Start all services"
echo "  3. Run database migrations"
echo "  4. Create admin user"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "=========================================="
echo "Step 1: Building Docker images"
echo "=========================================="
docker compose build

echo ""
echo "=========================================="
echo "Step 2: Starting services"
echo "=========================================="
docker compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

echo ""
echo "=========================================="
echo "Step 3: Running database migrations"
echo "=========================================="
docker compose exec backend npx prisma migrate deploy

echo ""
echo "=========================================="
echo "Step 4: Creating admin user"
echo "=========================================="
docker compose exec backend npm run create-admin

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Your application is running:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
echo "  API: http://$(hostname -I | awk '{print $1}')/api"
echo "  Admin: http://$(hostname -I | awk '{print $1}')/admin/login"
echo ""
echo "Useful commands:"
echo "  View logs: docker compose logs -f"
echo "  Stop services: docker compose down"
echo "  Restart: docker compose restart"
echo ""
echo "Check status:"
docker compose ps
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
