# Upload System Migration Guide

## 🎯 Quick Start

Follow these steps to migrate to the unified upload system:

### **Step 1: Backup Database** ⚠️ CRITICAL
```bash
# Backup your database before migration
docker-compose exec postgres pg_dump -U your_user your_database > backup_$(date +%Y%m%d).sql
```

### **Step 2: Run Database Migration**
```bash
cd backend

# Generate migration
npx prisma migrate dev --name add_upload_sessions_and_async_thumbnails

# This will:
# - Add UploadSession table
# - Add thumbnailStatus, uploadStatus, uploadSessionId to Photo table
# - Make thumbnailUrl nullable
# - Add necessary indexes

# Generate Prisma client
npx prisma generate
```

### **Step 3: Migrate Existing Photos**

Run this migration script to update existing photos:

```typescript
// backend/src/scripts/migrateExistingPhotos.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateExistingPhotos() {
  console.log('🔄 Migrating existing photos...')
  
  // Update all existing photos to have COMPLETED status
  const result = await prisma.photo.updateMany({
    where: {
      thumbnailStatus: null
    },
    data: {
      thumbnailStatus: 'COMPLETED',
      uploadStatus: 'COMPLETED'
    }
  })
  
  console.log(`✅ Migrated ${result.count} photos`)
  
  // Find photos with missing thumbnails
  const photosWithoutThumbnails = await prisma.photo.findMany({
    where: {
      thumbnailUrl: null
    }
  })
  
  if (photosWithoutThumbnails.length > 0) {
    console.log(`⚠️  Found ${photosWithoutThumbnails.length} photos without thumbnails`)
    console.log('   These will need thumbnail regeneration')
  }
  
  await prisma.$disconnect()
}

migrateExistingPhotos()
  .catch(console.error)
  .finally(() => process.exit(0))
```

Run it:
```bash
cd backend
npx ts-node src/scripts/migrateExistingPhotos.ts
```

### **Step 4: Rebuild Backend**
```bash
cd backend
npm run build
```

### **Step 5: Restart Services**
```bash
# Stop services
docker-compose down

# Rebuild containers
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### **Step 6: Verify Migration**
```bash
# Check backend logs
docker-compose logs backend | grep "Features:"

# Should see:
# Features: High-volume uploads (2000 files), RAW support, Async thumbnails
# Max file size: 200MB
# Max files per session: 2000
```

### **Step 7: Test Upload**
1. Go to gallery management page
2. Upload a single photo
3. Verify photo appears immediately
4. Check that thumbnail generates in background
5. Upload a batch of 10-20 photos
6. Verify all upload successfully

---

## 🔧 Troubleshooting

### **Migration Fails**
```bash
# Reset migration (⚠️ DEVELOPMENT ONLY)
npx prisma migrate reset

# Or manually fix and retry
npx prisma migrate resolve --applied <migration_name>
npx prisma migrate deploy
```

### **Thumbnails Not Generating**
```bash
# Check thumbnail queue status
curl http://localhost:5000/api/uploads/status

# Check backend logs
docker-compose logs -f backend | grep "thumbnail"
```

### **Upload Fails with 413 Error**
```bash
# Check nginx config
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep client_max_body_size

# Should be: client_max_body_size 200M;

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### **Rate Limit Errors (429)**
```bash
# Check current upload status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/uploads/status

# Increase limits in backend/src/config/uploadConfig.ts if needed
```

---

## 📊 Verification Checklist

After migration, verify:

- [ ] Database migration completed successfully
- [ ] Existing photos have `thumbnailStatus = 'COMPLETED'`
- [ ] New uploads create photos with `thumbnailStatus = 'PENDING'`
- [ ] Thumbnails generate asynchronously
- [ ] Upload config endpoint returns new limits
- [ ] Server logs show correct configuration
- [ ] Nginx accepts 200MB files
- [ ] Rate limiting works (50 req/s)
- [ ] Concurrent uploads work (25 per user)
- [ ] No errors in backend logs
- [ ] No errors in frontend console

---

## 🔄 Rollback Plan

If something goes wrong:

### **Option 1: Rollback Migration**
```bash
cd backend

# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# Restore from backup
docker-compose exec -T postgres psql -U your_user your_database < backup_YYYYMMDD.sql
```

### **Option 2: Revert Code**
```bash
# Revert to previous commit
git revert HEAD

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 📝 Post-Migration Tasks

1. **Monitor Performance**
   - Watch server CPU/memory usage
   - Monitor upload success rates
   - Check thumbnail generation queue

2. **Update Documentation**
   - Update API documentation
   - Update user guides
   - Update deployment docs

3. **Notify Users**
   - Inform about new upload limits
   - Explain async thumbnail generation
   - Provide support for any issues

---

## 🎉 Success Criteria

Migration is successful when:

✅ All existing photos display correctly
✅ New uploads work with async thumbnails
✅ Server handles 2000 file uploads
✅ No increase in error rates
✅ Server performance is stable
✅ Users can upload larger files (200MB)
✅ Upload speed improved (2-3x faster)

---

*Estimated Migration Time: 15-30 minutes*
*Downtime Required: 5-10 minutes*
