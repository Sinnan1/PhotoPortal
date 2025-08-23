# Database Schema Documentation

This document provides a comprehensive overview of the Photo Portal database schema, including table structures, relationships, and data models.

## 🗄️ Database Overview

The Photo Portal uses **PostgreSQL** as the primary database with **Prisma ORM** for database operations. The schema is designed to support a multi-tenant system where photographers can manage multiple galleries and clients.

## 🔗 Entity Relationship Diagram

```
Users (Photographers & Clients)
├── Galleries (Photo Collections)
│   ├── Photos (Individual Images)
│   │   ├── LikedPhotos (User Likes)
│   │   └── FavoritedPhotos (User Favorites)
│   ├── LikedGalleries (User Likes)
│   ├── FavoritedGalleries (User Favorites)
│   └── GalleryAccess (Client Access Permissions)
└── Clients (Photographer-Client Relationships)
```

## 👥 Users Table

**Table Name**: `users`

**Description**: Stores all user accounts including photographers and clients.

### Schema
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role Role NOT NULL DEFAULT 'CLIENT',
  photographer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | `VARCHAR(255)` | Unique identifier | Primary Key, CUID format |
| `email` | `VARCHAR(255)` | User email address | Unique, Required |
| `password` | `VARCHAR(255)` | Hashed password | Required, bcrypt hashed |
| `name` | `VARCHAR(255)` | User's full name | Required |
| `role` | `Role` | User role | Enum: PHOTOGRAPHER, CLIENT |
| `photographer_id` | `VARCHAR(255)` | Reference to photographer | Foreign Key (self-referencing) |
| `created_at` | `TIMESTAMP` | Account creation time | Auto-generated |
| `updated_at` | `TIMESTAMP` | Last update time | Auto-updated |

### Role Enum
```sql
CREATE TYPE Role AS ENUM ('PHOTOGRAPHER', 'CLIENT');
```

### Relationships
- **Self-referencing**: `photographer_id` → `users.id` (for client-photographer relationships)
- **One-to-Many**: One photographer can have many clients
- **One-to-Many**: One user can create many galleries
- **Many-to-Many**: Users can like/favorite multiple photos and galleries

### Indexes
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_photographer_id ON users(photographer_id);
```

## 🖼️ Galleries Table

**Table Name**: `galleries`

**Description**: Stores photo galleries created by photographers.

### Schema
```sql
CREATE TABLE galleries (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  password VARCHAR(255),
  expires_at TIMESTAMP,
  download_limit INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  photographer_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | `VARCHAR(255)` | Unique identifier | Primary Key, CUID format |
| `title` | `VARCHAR(255)` | Gallery title | Required |
| `description` | `TEXT` | Gallery description | Optional |
| `password` | `VARCHAR(255)` | Access password | Optional, for private galleries |
| `expires_at` | `TIMESTAMP` | Expiration date | Optional, for temporary access |
| `download_limit` | `INTEGER` | Max downloads allowed | Default: 0 (unlimited) |
| `download_count` | `INTEGER` | Current download count | Default: 0 |
| `photographer_id` | `VARCHAR(255)` | Gallery owner | Foreign Key, Required |
| `created_at` | `TIMESTAMP` | Creation time | Auto-generated |
| `updated_at` | `TIMESTAMP` | Last update time | Auto-updated |

### Relationships
- **Many-to-One**: Many galleries belong to one photographer
- **One-to-Many**: One gallery can contain many photos
- **Many-to-Many**: Galleries can be liked/favorited by multiple users

### Indexes
```sql
CREATE INDEX idx_galleries_photographer_id ON galleries(photographer_id);
CREATE INDEX idx_galleries_expires_at ON galleries(expires_at);
CREATE INDEX idx_galleries_created_at ON galleries(created_at);
```

## 📸 Photos Table

**Table Name**: `photos`

**Description**: Stores individual photos within galleries.

### Schema
```sql
CREATE TABLE photos (
  id VARCHAR(255) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  download_count INTEGER DEFAULT 0,
  gallery_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | `VARCHAR(255)` | Unique identifier | Primary Key, CUID format |
| `filename` | `VARCHAR(255)` | Original filename | Required |
| `original_url` | `VARCHAR(500)` | High-resolution image URL | Required |
| `thumbnail_url` | `VARCHAR(500)` | Thumbnail image URL | Required |
| `file_size` | `INTEGER` | File size in bytes | Required |
| `download_count` | `INTEGER` | Download count | Default: 0 |
| `gallery_id` | `VARCHAR(255)` | Parent gallery | Foreign Key, Required |
| `created_at` | `TIMESTAMP` | Upload time | Auto-generated |

### Relationships
- **Many-to-One**: Many photos belong to one gallery
- **One-to-Many**: One photo can be liked/favorited by multiple users

### Indexes
```sql
CREATE INDEX idx_photos_gallery_id ON photos(gallery_id);
CREATE INDEX idx_photos_created_at ON photos(created_at);
CREATE INDEX idx_photos_filename ON photos(filename);
```

## ❤️ LikedPhotos Table

**Table Name**: `liked_photos`

**Description**: Junction table for user photo likes.

### Schema
```sql
CREATE TABLE liked_photos (
  user_id VARCHAR(255) NOT NULL,
  photo_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, photo_id)
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `user_id` | `VARCHAR(255)` | User who liked | Foreign Key, Part of Primary Key |
| `photo_id` | `VARCHAR(255)` | Liked photo | Foreign Key, Part of Primary Key |
| `created_at` | `TIMESTAMP` | Like timestamp | Auto-generated |

### Relationships
- **Many-to-Many**: Users can like multiple photos, photos can be liked by multiple users
- **Composite Primary Key**: Prevents duplicate likes

### Indexes
```sql
CREATE INDEX idx_liked_photos_user_id ON liked_photos(user_id);
CREATE INDEX idx_liked_photos_photo_id ON liked_photos(photo_id);
```

## ⭐ FavoritedPhotos Table

**Table Name**: `favorited_photos`

**Description**: Junction table for user photo favorites.

### Schema
```sql
CREATE TABLE favorited_photos (
  user_id VARCHAR(255) NOT NULL,
  photo_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, photo_id)
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `user_id` | `VARCHAR(255)` | User who favorited | Foreign Key, Part of Primary Key |
| `photo_id` | `VARCHAR(255)` | Favorited photo | Foreign Key, Part of Primary Key |
| `created_at` | `TIMESTAMP` | Favorite timestamp | Auto-generated |

### Relationships
- **Many-to-Many**: Users can favorite multiple photos, photos can be favorited by multiple users
- **Composite Primary Key**: Prevents duplicate favorites

### Indexes
```sql
CREATE INDEX idx_favorited_photos_user_id ON favorited_photos(user_id);
CREATE INDEX idx_favorited_photos_photo_id ON favorited_photos(photo_id);
```

## ❤️ LikedGalleries Table

**Table Name**: `liked_galleries`

**Description**: Junction table for user gallery likes.

### Schema
```sql
CREATE TABLE liked_galleries (
  user_id VARCHAR(255) NOT NULL,
  gallery_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, gallery_id)
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `user_id` | `VARCHAR(255)` | User who liked | Foreign Key, Part of Primary Key |
| `gallery_id` | `VARCHAR(255)` | Liked gallery | Foreign Key, Part of Primary Key |
| `created_at` | `TIMESTAMP` | Like timestamp | Auto-generated |

### Relationships
- **Many-to-Many**: Users can like multiple galleries, galleries can be liked by multiple users
- **Composite Primary Key**: Prevents duplicate likes

### Indexes
```sql
CREATE INDEX idx_liked_galleries_user_id ON liked_galleries(user_id);
CREATE INDEX idx_liked_galleries_gallery_id ON liked_galleries(gallery_id);
```

## ⭐ FavoritedGalleries Table

**Table Name**: `favorited_galleries`

**Description**: Junction table for user gallery favorites.

### Schema
```sql
CREATE TABLE favorited_galleries (
  user_id VARCHAR(255) NOT NULL,
  gallery_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, gallery_id)
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `user_id` | `VARCHAR(255)` | User who favorited | Foreign Key, Part of Primary Key |
| `gallery_id` | `VARCHAR(255)` | Favorited gallery | Foreign Key, Part of Primary Key |
| `created_at` | `TIMESTAMP` | Favorite timestamp | Auto-generated |

### Relationships
- **Many-to-Many**: Users can favorite multiple galleries, galleries can be favorited by multiple users
- **Composite Primary Key**: Prevents duplicate favorites

### Indexes
```sql
CREATE INDEX idx_favorited_galleries_user_id ON favorited_galleries(user_id);
CREATE INDEX idx_favorited_galleries_gallery_id ON favorited_galleries(gallery_id);
```

## 🔐 GalleryAccess Table

**Table Name**: `gallery_access`

**Description**: Junction table for client gallery access permissions.

### Schema
```sql
CREATE TABLE gallery_access (
  user_id VARCHAR(255) NOT NULL,
  gallery_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, gallery_id)
);
```

### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `user_id` | `VARCHAR(255)` | Client user | Foreign Key, Part of Primary Key |
| `gallery_id` | `VARCHAR(255)` | Accessible gallery | Foreign Key, Part of Primary Key |
| `created_at` | `TIMESTAMP` | Access granted timestamp | Auto-generated |

### Relationships
- **Many-to-Many**: Clients can access multiple galleries, galleries can be accessed by multiple clients
- **Composite Primary Key**: Prevents duplicate access entries

### Indexes
```sql
CREATE INDEX idx_gallery_access_user_id ON gallery_access(user_id);
CREATE INDEX idx_gallery_access_gallery_id ON gallery_access(gallery_id);
```

## 🔗 Foreign Key Constraints

```sql
-- Users table constraints
ALTER TABLE users ADD CONSTRAINT fk_users_photographer 
  FOREIGN KEY (photographer_id) REFERENCES users(id) ON DELETE SET NULL;

-- Galleries table constraints
ALTER TABLE galleries ADD CONSTRAINT fk_galleries_photographer 
  FOREIGN KEY (photographer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Photos table constraints
ALTER TABLE photos ADD CONSTRAINT fk_photos_gallery 
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE;

-- LikedPhotos table constraints
ALTER TABLE liked_photos ADD CONSTRAINT fk_liked_photos_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE liked_photos ADD CONSTRAINT fk_liked_photos_photo 
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;

-- FavoritedPhotos table constraints
ALTER TABLE favorited_photos ADD CONSTRAINT fk_favorited_photos_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE favorited_photos ADD CONSTRAINT fk_favorited_photos_photo 
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;

-- LikedGalleries table constraints
ALTER TABLE liked_galleries ADD CONSTRAINT fk_liked_galleries_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE liked_galleries ADD CONSTRAINT fk_liked_galleries_gallery 
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE;

-- FavoritedGalleries table constraints
ALTER TABLE favorited_galleries ADD CONSTRAINT fk_favorited_galleries_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE favorited_galleries ADD CONSTRAINT fk_favorited_galleries_gallery 
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE;

-- GalleryAccess table constraints
ALTER TABLE gallery_access ADD CONSTRAINT fk_gallery_access_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE gallery_access ADD CONSTRAINT fk_gallery_access_gallery 
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE;
```

## 📊 Data Types and Constraints

### String Fields
- **IDs**: CUID format (25 characters)
- **Emails**: Standard email format validation
- **Names**: 255 character limit
- **URLs**: 500 character limit for storage URLs
- **Passwords**: bcrypt hashed (60+ characters)

### Numeric Fields
- **File Sizes**: Integer in bytes
- **Counts**: Integer with default 0
- **Limits**: Integer with default 0 (unlimited)

### Timestamp Fields
- **Created/Updated**: ISO 8601 format
- **Expiration**: Optional future date

### Enum Values
- **User Roles**: `PHOTOGRAPHER`, `CLIENT`

## 🔍 Query Examples

### Get Photographer with Galleries
```sql
SELECT 
  u.id, u.name, u.email,
  g.id as gallery_id, g.title, g.description,
  COUNT(p.id) as photo_count
FROM users u
LEFT JOIN galleries g ON u.id = g.photographer_id
LEFT JOIN photos p ON g.id = p.gallery_id
WHERE u.role = 'PHOTOGRAPHER'
GROUP BY u.id, g.id;
```

### Get Client Accessible Galleries
```sql
SELECT 
  g.id, g.title, g.description,
  u.name as photographer_name
FROM gallery_access ga
JOIN galleries g ON ga.gallery_id = g.id
JOIN users u ON g.photographer_id = u.id
WHERE ga.user_id = 'client-user-id';
```

### Get Popular Photos
```sql
SELECT 
  p.id, p.filename, p.download_count,
  COUNT(lp.user_id) as like_count,
  COUNT(fp.user_id) as favorite_count
FROM photos p
LEFT JOIN liked_photos lp ON p.id = lp.photo_id
LEFT JOIN favorited_photos fp ON p.id = fp.photo_id
GROUP BY p.id
ORDER BY p.download_count DESC, like_count DESC
LIMIT 10;
```

## 🚀 Performance Considerations

### Indexing Strategy
- **Primary Keys**: All tables use CUID for distributed systems
- **Foreign Keys**: Indexed for fast joins
- **Search Fields**: Email, filename, and timestamps indexed
- **Composite Indexes**: Junction tables use composite primary keys

### Partitioning
- **Photos Table**: Consider partitioning by gallery_id for large datasets
- **Timestamps**: Partition by month/year for analytics queries

### Caching Strategy
- **Gallery Metadata**: Cache frequently accessed gallery information
- **User Sessions**: Cache user authentication data
- **Photo URLs**: Cache generated URLs to reduce storage API calls

## 🔒 Security Considerations

### Data Protection
- **Passwords**: bcrypt hashed with salt
- **File URLs**: Signed URLs with expiration
- **Access Control**: Row-level security through foreign keys

### Privacy Features
- **Gallery Passwords**: Optional encryption for private galleries
- **Expiration Dates**: Automatic cleanup of expired content
- **Download Limits**: Prevent abuse and track usage

## 📈 Scaling Considerations

### Horizontal Scaling
- **Database**: Read replicas for analytics queries
- **File Storage**: Multi-region CDN distribution
- **Application**: Stateless design for multiple instances

### Vertical Scaling
- **Connection Pooling**: Optimize database connections
- **Query Optimization**: Use database query analyzers
- **Index Tuning**: Monitor and adjust based on usage patterns