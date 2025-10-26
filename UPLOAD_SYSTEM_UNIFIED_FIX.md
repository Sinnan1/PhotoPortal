# Upload System Unified Fix - Implementation Plan

## 🎯 Goal
Support 1000-2000 images per upload session with consistent limits across all layers.

## 📊 Unified Configuration

### **Single Source of Truth**

```typescript
// UPLOAD LIMITS (Consistent across all layers)
MAX_FILE_SIZE = 200MB          // Per individual file
CHUNK_SIZE = 10MB              // Multipart upload chunk size
MAX_FILES_PER_SESSION = 2000   // Total files in one session
MAX_FILES_PER_BATCH = 50       // Process 50 at a time
MAX_CONCURRENT_UPLOADS = 20    // Per user concurrent uploads
MAX_TOTAL_BATCH_SIZE = 10GB    // Per batch total size

// BACKEND LIMITS
MAX_GLOBAL_CONCURRENT = 100    // Total concurrent uploads (all users)
MAX_PER_USER_CONCURRENT = 25   // Per user concurrent limit
UPLOAD_RATE_LIMIT = 50         // Requests per second
BURST_SIZE = 100               // Rate limit burst

// TIMEOUTS
UPLOAD_TIMEOUT = 30 minutes    // Per file upload
SESSION_TIMEOUT = 4 hours      // Total session
```

---

## 🔧 Files to Modify

### **Backend Files:**
1. ✅ `backend/src/config/uploadConfig.ts` (NEW - Single source of truth)
2. ✅ `backend/src/server.ts` (Update limits)
3. ✅ `backend/src/routes/uploads.ts` (Update rate limiting)
4. ✅ `backend/src/controllers/uploadsController.ts` (Add session support)
5. ✅ `backend/src/controllers/photoController.ts` (Remove/deprecate old system)
6. ✅ `backend/prisma/schema.prisma` (Add UploadSession model)
7. ✅ `backend/src/services/uploadSessionService.ts` (NEW)
8. ✅ `backend/src/services/thumbnailQueue.ts` (NEW - Async thumbnails)

### **Frontend Files:**
1. ✅ `frontend/src/config/uploadConfig.ts` (NEW - Mirror backend config)
2. ✅ `frontend/src/app/galleries/[id]/manage/uploadUtils.ts` (Update chunk size)
3. ✅ `frontend/src/app/galleries/[id]/manage/page.tsx` (Add batch splitting)
4. ✅ `frontend/lib/api.ts` (Add session endpoints)

### **Nginx Files:**
1. ✅ `nginx/nginx.conf` (Update limits)
2. ✅ `nginx/nginx.local.conf` (Update limits)

---

## 📝 Implementation Steps

### **Step 1: Create Unified Config (Backend)**
### **Step 2: Update Database Schema**
### **Step 3: Create Upload Session Service**
### **Step 4: Create Thumbnail Queue**
### **Step 5: Update Upload Routes & Controllers**
### **Step 6: Update Server Configuration**
### **Step 7: Update Nginx Configuration**
### **Step 8: Create Frontend Config**
### **Step 9: Update Frontend Upload Logic**
### **Step 10: Update API Client**

---

## 🚀 Ready to implement!
