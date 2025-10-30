#!/bin/bash

# Deploy backend only (for quick backend fixes)
echo "🚀 Deploying backend only..."

# Stop backend container
docker-compose stop backend

# Rebuild backend
docker-compose build backend

# Start backend
docker-compose up -d backend

echo "✅ Backend deployed!"
echo "📊 Checking logs..."
docker-compose logs --tail=50 backend
