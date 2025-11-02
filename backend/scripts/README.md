# Database Scripts

## Backfill EXIF Dates

This script extracts EXIF capture dates from existing photos and updates the database.

### Usage

```bash
cd backend
npx ts-node scripts/backfill-exif-dates.ts
```

### What it does

1. Finds all photos with `capturedAt = NULL`
2. Downloads each photo from B2 storage
3. Extracts EXIF `DateTimeOriginal` or `CreateDate`
4. Updates the database with the capture date
5. Shows progress every 50 photos

### Performance

- Processes ~1000 photos in approximately 10-20 minutes
- Adds 100ms delay between photos to avoid overwhelming B2
- Safe to run multiple times (only processes photos without dates)

### Notes

- Photos without EXIF data will remain `NULL` and sort by upload time
- The script can be interrupted and restarted safely
- Progress is shown in real-time
