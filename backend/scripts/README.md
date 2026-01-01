# Database and Utility Scripts

This directory contains utility scripts for database maintenance, migration, and system management.

## Available Scripts

### 1. Backfill EXIF Dates

Extracts EXIF capture dates from existing photos and updates the database.

#### Usage

```bash
cd backend
npx ts-node scripts/backfill-exif-dates.ts
```

#### What it does

1. Finds all photos with `capturedAt = NULL`
2. Downloads the first 64KB of each photo from B2 storage (where EXIF data resides)
3. Extracts EXIF `DateTimeOriginal` or `CreateDate` metadata
4. Updates the database with the capture date
5. Shows progress every 50 photos

#### Performance

- Processes ~1000 photos in approximately 10-20 minutes
- Adds 100ms delay between photos to avoid overwhelming B2
- Safe to run multiple times (only processes photos without dates)
- Only downloads first 64KB per photo for efficiency

#### Notes

- Photos without EXIF data will remain `NULL` and sort by upload time
- The script can be interrupted and restarted safely
- Progress is shown in real-time
- Useful for populating capture dates on existing photo collections

---

### 2. Migrate Gallery Dates

Populates `shootDate`, `shootYear`, and `shootMonth` fields for existing galleries using their `createdAt` timestamp.

#### Usage

```bash
cd backend
npx ts-node scripts/migrate-gallery-dates.ts
```

#### What it does

1. Finds all galleries with `shootDate = NULL`
2. Uses the gallery's `createdAt` date as the shoot date
3. Automatically derives `shootYear` and `shootMonth` from the date
4. Updates the database with the timeline information

#### Use Cases

- Initial migration when adding timeline features
- Populating dates for galleries created before the timeline feature
- Setting default dates for galleries without explicit shoot dates

#### Notes

- Only processes galleries that don't have a shoot date
- Safe to run multiple times
- The derived dates can be manually updated later through the UI

---

### 3. Verify Imports

A diagnostic script to verify TypeScript module imports and resolve dependency issues.

#### Usage

```bash
cd backend
npx ts-node scripts/verify-imports.ts
```

#### What it does

- Tests importing specific modules (e.g., `uploadsController`)
- Helps diagnose TypeScript compilation or dependency issues
- Validates that all imports resolve correctly

#### Use Cases

- Debugging module resolution issues
- Verifying build configuration
- Testing after major dependency updates

---

## Common Commands

### Admin User Management

Create the first admin user:
```bash
cd backend
npm run create-admin
# or
npm run admin-setup
```

### Database Management

View database in browser:
```bash
npx prisma studio
```

Create a new migration:
```bash
npx prisma migrate dev --name migration-name
```

Apply migrations in production:
```bash
npx prisma migrate deploy
```

Reset database (⚠️ deletes all data):
```bash
npm run db:reset
```

---

## Script Development Guidelines

When creating new utility scripts:

1. **Add usage documentation** in this README
2. **Include error handling** for database and network operations
3. **Make scripts idempotent** - safe to run multiple times
4. **Show progress** for long-running operations
5. **Add a delay** when making many external API calls
6. **Log meaningful messages** for debugging
7. **Use TypeScript** with proper types from Prisma

### Example Script Template

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔄 Starting operation...')
    
    // Your logic here
    
    console.log('✅ Operation completed successfully')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit())
```
