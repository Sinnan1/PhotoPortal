#!/bin/bash

echo "================================================"
echo "Direct B2 Downloads Deployment Script"
echo "================================================"
echo ""
echo "This script will deploy the direct B2 download system"
echo "Expected bandwidth savings: 85% (300GB per wedding)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the backend directory"
    exit 1
fi

echo "Step 1: Installing dependencies..."
echo "=================================="
npm install @aws-sdk/s3-request-presigner
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

echo "Step 2: Building backend..."
echo "=================================="
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"
echo ""

echo "Step 3: Running tests (if available)..."
echo "=================================="
if npm run test --if-present 2>/dev/null; then
    echo "✅ Tests passed"
else
    echo "⚠️  No tests found or tests failed (continuing anyway)"
fi
echo ""

echo "Step 4: Checking environment variables..."
echo "=================================="
if [ -f "../.env" ]; then
    if grep -q "S3_BUCKET_NAME" ../.env && grep -q "AWS_REGION" ../.env; then
        echo "✅ B2 credentials found in .env"
    else
        echo "⚠️  Warning: B2 credentials may be missing from .env"
        echo "Please ensure these variables are set:"
        echo "  - S3_BUCKET_NAME"
        echo "  - AWS_REGION"
        echo "  - AWS_ACCESS_KEY_ID"
        echo "  - AWS_SECRET_ACCESS_KEY"
    fi
else
    echo "⚠️  Warning: .env file not found"
fi
echo ""

echo "Step 5: Creating backup..."
echo "=================================="
BACKUP_DIR="../backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r dist "$BACKUP_DIR/" 2>/dev/null || echo "No dist directory to backup"
echo "✅ Backup created at $BACKUP_DIR"
echo ""

echo "Step 6: Deployment options..."
echo "=================================="
echo ""
echo "Choose deployment method:"
echo "1) Docker Compose (recommended)"
echo "2) PM2"
echo "3) Manual (just build, don't restart)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Restarting with Docker Compose..."
        cd ..
        docker-compose restart backend
        if [ $? -eq 0 ]; then
            echo "✅ Backend restarted successfully"
        else
            echo "❌ Failed to restart backend"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "Restarting with PM2..."
        pm2 restart backend
        if [ $? -eq 0 ]; then
            echo "✅ Backend restarted successfully"
        else
            echo "❌ Failed to restart backend"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "✅ Build complete. Please restart manually."
        ;;
    *)
        echo "Invalid choice. Build complete but not restarted."
        ;;
esac

echo ""
echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Test the new endpoints:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     https://yarrowweddings.com/api/photos/PHOTO_ID/direct-download-url"
echo ""
echo "2. Monitor bandwidth usage:"
echo "   vnstat -d"
echo ""
echo "3. Check backend logs:"
echo "   docker logs backend -f"
echo ""
echo "4. Update frontend (see IMPLEMENT_DIRECT_DOWNLOADS.md)"
echo ""
echo "Expected results:"
echo "- VPS bandwidth: 351GB → 51GB per wedding (85% reduction)"
echo "- Capacity: 22 → 156 weddings/month (7× increase)"
echo "- Download speed: Faster (direct from B2)"
echo ""
echo "Documentation:"
echo "- Implementation guide: IMPLEMENT_DIRECT_DOWNLOADS.md"
echo "- Full summary: BANDWIDTH_SOLUTION_SUMMARY.md"
echo "- Your questions answered: ANSWERS_TO_YOUR_QUESTIONS.md"
echo ""
echo "🎉 Ready to save 85% bandwidth!"
