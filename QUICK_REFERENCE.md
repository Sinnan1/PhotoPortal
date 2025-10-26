# Upload System - Quick Reference Card

## 🚀 Quick Deploy

```bash
# 1. Migrate database
cd backend
npx prisma migrate dev --name add_upload_sessions
npx prisma generate
npx ts-node src/scripts/migrateExistingPhotos.ts

# 2. Rebuild & restart
cd ..
docker-compose down
docker-compose build
docker-compose up -d

# 3. Verify
docker-compose logs -f backend | grep "Features:"
```

---

## 📊 New Limits (Unified)

| Setting | Value |
|---------|-------|
| Max File Size | **200MB** |
| Chunk Size | **10MB** |
| Max Files/Session | **2000** |
| Concurrent/User | **25** |
| Global Concurrent | **100** |
| Rate Limit | **50 req/s** |
| Burst | **100** |
| Upload Timeout | **30 min** |
| Session Timeout | **4 hours** |

---

## 🔧 Key Files

### **Config:**
- `backend/src/config/uploadConfig.ts` - Backend limits
- `frontend/src/config/uploadConfig.ts` - Frontend limits

### **Services:**
- `backend/src/services/uploadSessionService.ts` - Session management
- `backend/src/services/thumbnailQueue.ts` - Async thumbnails

### **Routes:**
- `backend/src/routes/uploads.ts` - Upload endpoints
- `backend/src/controllers/uploadsController.ts` - Upload logic

---

## 🔍 Monitoring

### **Check Upload Status:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/uploads/status
```

### **Check Server Health:**
```bash
curl http://localhost:5000/api/system-status
```

### **Check Upload Config:**
```bash
curl http://localhost:5000/api/upload-config
```

### **View Logs:**
```bash
# Backend logs
docker-compose logs -f backend

# Nginx logs
docker-compose logs -f nginx

# Filter for uploads
docker-compose logs backend | grep "upload"
```

---

## 🐛 Common Issues

### **413 Request Too Large**
```bash
# Check nginx config
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep client_max_body_size

# Should be: 200M
# Fix: Update nginx.conf and reload
docker-compose exec nginx nginx -s reload
```

### **429 Too Many Requests**
```bash
# Check current status
curl http://localhost:5000/api/uploads/status

# Increase limits in:
# backend/src/config/uploadConfig.ts
```

### **Thumbnails Not Generating**
```bash
# Check queue status
docker-compose logs backend | grep "thumbnail"

# Check photo status in database
docker-compose exec postgres psql -U user -d db \
  -c "SELECT thumbnailStatus, COUNT(*) FROM photos GROUP BY thumbnailStatus;"
```

---

## 📝 Quick Config Changes

### **Increase File Size Limit:**
1. Edit `backend/src/config/uploadConfig.ts`:
   ```typescript
   MAX_FILE_SIZE: 300 * 1024 * 1024  // 300MB
   ```
2. Edit `nginx/nginx.conf`:
   ```nginx
   client_max_body_size 300M;
   ```
3. Restart: `docker-compose restart`

### **Increase Concurrent Uploads:**
1. Edit `backend/src/config/uploadConfig.ts`:
   ```typescript
   MAX_CONCURRENT_UPLOADS_PER_USER: 50
   MAX_GLOBAL_CONCURRENT_UPLOADS: 200
   ```
2. Restart: `docker-compose restart backend`

### **Increase Rate Limit:**
1. Edit `nginx/nginx.conf`:
   ```nginx
   rate=100r/s;
   burst=200;
   ```
2. Reload: `docker-compose exec nginx nginx -s reload`

---

## ✅ Health Check

```bash
# All should return success
curl http://localhost:5000/health
curl http://localhost:5000/api/health
curl http://localhost:5000/api/system-status
curl http://localhost:5000/api/upload-config
```

---

## 📞 Support

- **Analysis**: See `UPLOAD_SYSTEM_ANALYSIS.md`
- **Changes**: See `UPLOAD_SYSTEM_CHANGES_SUMMARY.md`
- **Migration**: See `MIGRATION_GUIDE.md`
- **Complete Guide**: See `IMPLEMENTATION_COMPLETE.md`

---

*Keep this card handy for quick reference!*
