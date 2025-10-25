#!/bin/bash

# Quick script to check production logs
echo "🔍 Checking backend logs for errors..."
echo ""

# Show last 100 lines of backend logs
docker-compose logs --tail=100 backend | grep -i "error\|failed\|multipart"

echo ""
echo "📊 Full backend logs (last 50 lines):"
docker-compose logs --tail=50 backend
