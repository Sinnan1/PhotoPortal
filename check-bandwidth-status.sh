#!/bin/bash

echo "=================================="
echo "BANDWIDTH & SYSTEM STATUS CHECK"
echo "=================================="
echo ""

# 1. VPS Bandwidth Usage
echo "1. VPS BANDWIDTH USAGE (vnstat)"
echo "=================================="
if command -v vnstat &> /dev/null; then
    echo "Monthly bandwidth usage:"
    vnstat -m
    echo ""
    echo "Current month details:"
    vnstat
    echo ""
    echo "Daily breakdown:"
    vnstat -d
else
    echo "⚠️  vnstat not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y vnstat
    echo "Please run this script again after vnstat collects data (wait 5 minutes)"
fi
echo ""

# 2. Check VPS Plan Details
echo "2. VPS PLAN & LIMITS"
echo "=================================="
echo "Checking system information..."
echo ""
echo "CPU Info:"
lscpu | grep "Model name"
lscpu | grep "CPU(s):"
echo ""
echo "Memory:"
free -h
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "Network Interfaces:"
ip addr show | grep "inet " | grep -v "127.0.0.1"
echo ""

# 3. Check Cloudflare Status
echo "3. CLOUDFLARE CDN STATUS"
echo "=================================="
echo "Checking if Cloudflare is active..."
echo ""

# Check DNS for Cloudflare nameservers
echo "Current nameservers:"
dig NS yarrowweddings.cloud +short
echo ""

# Check if site is behind Cloudflare
echo "Checking yarrowweddings.cloud for Cloudflare headers..."
curl -sI https://yarrowweddings.cloud | grep -i "cf-ray\|cf-cache-status\|server"
echo ""

# Check CDN subdomain if configured
echo "Checking cdn.yarrowweddings.cloud (if configured)..."
curl -sI https://cdn.yarrowweddings.cloud 2>/dev/null | grep -i "cf-ray\|cf-cache-status\|server" || echo "CDN subdomain not configured or not responding"
echo ""

# 4. Check Environment Variables
echo "4. ENVIRONMENT CONFIGURATION"
echo "=================================="
echo "Checking .env for CDN and B2 configuration..."
echo ""

if [ -f .env ]; then
    echo "CDN_URL: $(grep CDN_URL .env | cut -d '=' -f2)"
    echo "S3_BUCKET_NAME: $(grep S3_BUCKET_NAME .env | cut -d '=' -f2)"
    echo "AWS_REGION: $(grep AWS_REGION .env | cut -d '=' -f2)"
    echo "NEXT_PUBLIC_API_URL: $(grep NEXT_PUBLIC_API_URL .env | cut -d '=' -f2)"
    echo "NEXT_PUBLIC_DIRECT_DOWNLOAD_URL: $(grep NEXT_PUBLIC_DIRECT_DOWNLOAD_URL .env | cut -d '=' -f2)"
else
    echo "⚠️  .env file not found in current directory"
fi
echo ""

# 5. Check Docker Container Status
echo "5. DOCKER CONTAINER STATUS"
echo "=================================="
if command -v docker &> /dev/null; then
    echo "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Container resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
else
    echo "⚠️  Docker not found"
fi
echo ""

# 6. Check Nginx Configuration
echo "6. NGINX CONFIGURATION"
echo "=================================="
if [ -f nginx/nginx.conf ]; then
    echo "Checking nginx.conf for proxy settings..."
    grep -A 5 "location /api" nginx/nginx.conf | head -10
    echo ""
    echo "Checking for CDN or cache headers..."
    grep -i "cache\|cdn\|expires" nginx/nginx.conf | head -5
else
    echo "⚠️  nginx/nginx.conf not found"
fi
echo ""

# 7. Check B2 Bucket Configuration
echo "7. BACKBLAZE B2 STATUS"
echo "=================================="
echo "Testing B2 connectivity..."
BUCKET_NAME=$(grep S3_BUCKET_NAME .env 2>/dev/null | cut -d '=' -f2)
AWS_REGION=$(grep AWS_REGION .env 2>/dev/null | cut -d '=' -f2)

if [ ! -z "$BUCKET_NAME" ] && [ ! -z "$AWS_REGION" ]; then
    B2_URL="https://s3.${AWS_REGION}.backblazeb2.com/${BUCKET_NAME}"
    echo "B2 Endpoint: $B2_URL"
    echo "Testing connectivity..."
    curl -sI "$B2_URL" | head -5
else
    echo "⚠️  B2 configuration not found in .env"
fi
echo ""

# 8. Check Recent Logs for Bandwidth Issues
echo "8. RECENT LOGS (Last 50 lines)"
echo "=================================="
if command -v docker &> /dev/null; then
    echo "Backend logs (checking for download/upload activity):"
    docker logs backend 2>&1 | grep -i "download\|upload\|bandwidth" | tail -20 || echo "No bandwidth-related logs found"
else
    echo "⚠️  Cannot check Docker logs"
fi
echo ""

# 9. Check Active Connections
echo "9. ACTIVE NETWORK CONNECTIONS"
echo "=================================="
echo "Current established connections:"
netstat -an | grep ESTABLISHED | wc -l
echo ""
echo "Connections by port:"
netstat -an | grep ESTABLISHED | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn | head -10
echo ""

# 10. Summary and Recommendations
echo "=================================="
echo "SUMMARY & NEXT STEPS"
echo "=================================="
echo ""
echo "Please review the output above and answer these questions:"
echo ""
echo "1. VPS BANDWIDTH LIMIT:"
echo "   - What is your monthly bandwidth limit? (Check Hostinger control panel)"
echo "   - Is it 8TB total or 8TB egress only?"
echo "   - Current usage from vnstat above: [CHECK ABOVE]"
echo ""
echo "2. CLOUDFLARE STATUS:"
echo "   - Are Cloudflare nameservers active? [CHECK ABOVE]"
echo "   - Do you see 'cf-ray' headers? [CHECK ABOVE]"
echo "   - Is CDN_URL set in .env? [CHECK ABOVE]"
echo ""
echo "3. DOWNLOAD USAGE:"
echo "   - How many times per month do clients download full galleries?"
echo "   - What percentage of users download vs just view?"
echo "   - Can we redesign to reduce ZIP downloads?"
echo ""
echo "4. CLOUDFLARE ERROR:"
echo "   - What exactly was the '100 timer' error message?"
echo "   - When did it occur? (During what operation?)"
echo "   - Do you have screenshots or logs?"
echo ""

echo "Run this command to save output to file:"
echo "bash check-bandwidth-status.sh > bandwidth-status-report.txt 2>&1"
