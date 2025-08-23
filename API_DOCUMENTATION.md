# API Documentation

This document provides comprehensive documentation for the Photo Portal API endpoints, including request/response formats, authentication, and examples.

## 🔐 Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header for protected endpoints:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register** (`POST /api/auth/register`) - Create a new account
2. **Login** (`POST /api/auth/login`) - Authenticate and receive JWT token
3. **Use token** - Include in subsequent requests
4. **Refresh** - Token expires after 24 hours, re-login required

## 👥 User Management

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "CLIENT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "CLIENT",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PHOTOGRAPHER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PHOTOGRAPHER",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## 🖼️ Gallery Management

### List Galleries
```http
GET /api/galleries
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search galleries by title
- `photographerId` (optional): Filter by photographer

**Response:**
```json
{
  "success": true,
  "data": {
    "galleries": [
      {
        "id": "gal1234567890",
        "title": "Wedding Day",
        "description": "Beautiful wedding photos",
        "password": null,
        "expiresAt": null,
        "downloadLimit": 0,
        "downloadCount": 0,
        "photographerId": "clx1234567890",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "photographer": {
          "id": "clx1234567890",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "_count": {
          "photos": 25
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Create Gallery
```http
POST /api/galleries
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "New Gallery",
  "description": "Gallery description",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "downloadLimit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gal1234567890",
    "title": "New Gallery",
    "description": "Gallery description",
    "password": "optional-password",
    "expiresAt": "2024-12-31T23:59:59Z",
    "downloadLimit": 100,
    "downloadCount": 0,
    "photographerId": "clx1234567890",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Gallery Details
```http
GET /api/galleries/:id
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gal1234567890",
    "title": "Wedding Day",
    "description": "Beautiful wedding photos",
    "password": null,
    "expiresAt": null,
    "downloadLimit": 0,
    "downloadCount": 0,
    "photographerId": "clx1234567890",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "photographer": {
      "id": "clx1234567890",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "photos": [
      {
        "id": "pho1234567890",
        "filename": "wedding-001.jpg",
        "originalUrl": "https://storage.example.com/original/wedding-001.jpg",
        "thumbnailUrl": "https://storage.example.com/thumbnails/wedding-001.jpg",
        "fileSize": 5242880,
        "downloadCount": 0,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Update Gallery
```http
PUT /api/galleries/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Updated Gallery Title",
  "description": "Updated description",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gal1234567890",
    "title": "Updated Gallery Title",
    "description": "Updated description",
    "expiresAt": "2024-12-31T23:59:59Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Delete Gallery
```http
DELETE /api/galleries/:id
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Gallery deleted successfully"
}
```

## 📸 Photo Management

### List Photos
```http
GET /api/photos
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `galleryId` (required): Filter photos by gallery
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "pho1234567890",
        "filename": "wedding-001.jpg",
        "originalUrl": "https://storage.example.com/original/wedding-001.jpg",
        "thumbnailUrl": "https://storage.example.com/thumbnails/wedding-001.jpg",
        "fileSize": 5242880,
        "downloadCount": 0,
        "galleryId": "gal1234567890",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Upload Photos
```http
POST /api/photos
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

galleryId: gal1234567890
photos: [file1, file2, file3]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded": 3,
    "failed": 0,
    "photos": [
      {
        "id": "pho1234567890",
        "filename": "wedding-001.jpg",
        "originalUrl": "https://storage.example.com/original/wedding-001.jpg",
        "thumbnailUrl": "https://storage.example.com/thumbnails/wedding-001.jpg",
        "fileSize": 5242880,
        "galleryId": "gal1234567890"
      }
    ]
  }
}
```

### Get Photo Details
```http
GET /api/photos/:id
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pho1234567890",
    "filename": "wedding-001.jpg",
    "originalUrl": "https://storage.example.com/original/wedding-001.jpg",
    "thumbnailUrl": "https://storage.example.com/thumbnails/wedding-001.jpg",
    "fileSize": 5242880,
    "downloadCount": 0,
    "galleryId": "gal1234567890",
    "createdAt": "2024-01-15T10:30:00Z",
    "gallery": {
      "id": "gal1234567890",
      "title": "Wedding Day"
    }
  }
}
```

### Delete Photo
```http
DELETE /api/photos/:id
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

## 📤 Upload Configuration

### Get Upload Configuration
```http
GET /api/upload-config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFileSize": 52428800,
    "maxFiles": 50,
    "supportedTypes": [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/tiff"
    ],
    "supportedExtensions": [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".tiff"
    ],
    "recommendedBatchSize": 20,
    "timeoutMinutes": 10
  }
}
```

## 🔍 Search and Filtering

### Search Galleries
```http
GET /api/galleries?search=wedding&page=1&limit=10
Authorization: Bearer <jwt-token>
```

### Filter Photos by Gallery
```http
GET /api/photos?galleryId=gal1234567890&page=1&limit=20
Authorization: Bearer <jwt-token>
```

## ❤️ Social Features

### Like Photo
```http
POST /api/photos/:id/like
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Photo liked successfully"
}
```

### Unlike Photo
```http
DELETE /api/photos/:id/like
Authorization: Bearer <jwt-token>
```

### Favorite Photo
```http
POST /api/photos/:id/favorite
Authorization: Bearer <jwt-token>
```

### Unfavorite Photo
```http
DELETE /api/photos/:id/favorite
Authorization: Bearer <jwt-token>
```

## 📊 Analytics

### Get Gallery Analytics
```http
GET /api/galleries/:id/analytics
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 150,
    "totalDownloads": 45,
    "totalLikes": 23,
    "totalFavorites": 12,
    "uniqueVisitors": 25,
    "popularPhotos": [
      {
        "id": "pho1234567890",
        "filename": "wedding-001.jpg",
        "downloadCount": 15,
        "likeCount": 8
      }
    ]
  }
}
```

## 🚨 Error Handling

All API endpoints return consistent error responses:

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Authentication Error
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Not found",
  "message": "Gallery not found"
}
```

### Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## 📝 Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Upload endpoints**: 10 requests per hour
- **General endpoints**: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## 🔒 Security Headers

The API includes security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## 📱 Mobile Optimization

All endpoints are optimized for mobile devices:

- Responsive JSON responses
- Efficient data pagination
- Optimized image URLs for different screen sizes
- Minimal payload sizes

## 🧪 Testing

Test the API using tools like:

- **Postman**: Import the collection
- **cURL**: Command-line testing
- **Insomnia**: Modern API client
- **Thunder Client**: VS Code extension

### Example cURL Commands

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get galleries (with auth)
curl -X GET http://localhost:5000/api/galleries \
  -H "Authorization: Bearer <your-token>"
```