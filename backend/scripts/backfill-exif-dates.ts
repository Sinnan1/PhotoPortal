/**
 * Backfill EXIF Capture Dates for Existing Photos
 * 
 * This script downloads existing photos from B2, extracts their EXIF capture dates,
 * and updates the database. Run this once after adding the capturedAt field.
 * 
 * Usage: npx ts-node scripts/backfill-exif-dates.ts
 */

import { PrismaClient } from '@prisma/client';
import { getPartialObjectFromS3 } from '../src/utils/s3Storage';

const prisma = new PrismaClient();

// EXIF data is typically in the first 64KB of a JPEG/image file
// However, professional cameras (Nikon, Canon, etc.) often include large
// maker notes and embedded thumbnails that can push date fields past 64KB
// Using 256KB to safely capture EXIF from professional camera files
const EXIF_BYTES = 262144; // 256KB

async function extractExifDate(photoUrl: string): Promise<Date | null> {
  try {
    // Parse B2 URL to get bucket and key
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    const bucketName = pathParts[0];
    const key = decodeURIComponent(pathParts.slice(1).join('/'));

    // Skip non-JPEG files (PNGs, etc. don't have EXIF)
    const ext = key.toLowerCase().split('.').pop();
    if (!['jpg', 'jpeg'].includes(ext || '')) {
      console.log(`  ⏭️ Skipping ${ext?.toUpperCase()} file (JPEG only)`);
      return null;
    }

    console.log(`  📥 Downloading first ${EXIF_BYTES / 1024}KB from B2`);

    // Download partial file
    const buffer = await getPartialObjectFromS3(key, EXIF_BYTES, bucketName);
    console.log(`  📊 Downloaded ${buffer.length} bytes`);

    // Try exif-parser first (designed for partial buffers)
    const ExifParser = require('exif-parser');

    try {
      const parser = ExifParser.create(buffer);
      parser.enableBinaryFields(false);
      const result = parser.parse();

      if (result.tags) {
        // exif-parser returns Unix timestamps (seconds since epoch)
        if (result.tags.DateTimeOriginal) {
          const capturedAt = new Date(result.tags.DateTimeOriginal * 1000);
          if (!isNaN(capturedAt.getTime())) {
            console.log(`  ✅ EXIF date: ${capturedAt.toISOString()}`);
            return capturedAt;
          }
        } else if (result.tags.CreateDate) {
          const capturedAt = new Date(result.tags.CreateDate * 1000);
          if (!isNaN(capturedAt.getTime())) {
            console.log(`  ✅ EXIF date: ${capturedAt.toISOString()}`);
            return capturedAt;
          }
        } else if (result.tags.ModifyDate) {
          const capturedAt = new Date(result.tags.ModifyDate * 1000);
          if (!isNaN(capturedAt.getTime())) {
            console.log(`  ✅ EXIF date: ${capturedAt.toISOString()}`);
            return capturedAt;
          }
        }
      }
    } catch (parseErr) {
      console.log(`  ⚠️ exif-parser failed, trying sharp...`);
    }

    // Fallback to sharp + exif-reader
    try {
      const sharp = require('sharp');
      const exifReader = require('exif-reader');

      const metadata = await sharp(buffer).metadata();

      if (metadata.exif) {
        const parsedExif = exifReader(metadata.exif);

        if (parsedExif.exif?.DateTimeOriginal) {
          console.log(`  ✅ EXIF date: ${parsedExif.exif.DateTimeOriginal.toISOString()}`);
          return parsedExif.exif.DateTimeOriginal;
        } else if (parsedExif.exif?.CreateDate) {
          console.log(`  ✅ EXIF date: ${parsedExif.exif.CreateDate.toISOString()}`);
          return parsedExif.exif.CreateDate;
        } else if (parsedExif.image?.DateTime) {
          console.log(`  ✅ EXIF date: ${parsedExif.image.DateTime.toISOString()}`);
          return parsedExif.image.DateTime;
        }
      }
    } catch (sharpErr) {
      // Both parsers failed
    }

    console.log(`  ⚠️ No EXIF date found`);
    return null;

  } catch (error) {
    console.error(`  ❌ Error:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// Number of concurrent workers
const CONCURRENCY = 2;

async function processPhoto(photo: { id: string; filename: string; originalUrl: string }, index: number, total: number): Promise<boolean> {
  console.log(`\n[${index}/${total}] Processing: ${photo.filename}`);

  try {
    const capturedAt = await extractExifDate(photo.originalUrl);

    if (capturedAt) {
      await prisma.photo.update({
        where: { id: photo.id },
        data: { capturedAt },
      });
      console.log(`  💾 Database updated`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ❌ Failed to process photo:`, error);
    return false;
  }
}

async function backfillExifDates() {
  console.log('🚀 Starting EXIF date backfill...');
  console.log(`⚡ Running with ${CONCURRENCY} concurrent workers\n`);

  try {
    // Get all photos without capturedAt
    const photos = await prisma.photo.findMany({
      where: {
        capturedAt: null,
      },
      select: {
        id: true,
        filename: true,
        originalUrl: true,
      },
      orderBy: {
        createdAt: 'desc', // Process newest uploads first
      },
    });

    console.log(`📸 Found ${photos.length} photos without EXIF dates\n`);

    if (photos.length === 0) {
      console.log('✅ All photos already have EXIF dates!');
      return;
    }

    let processed = 0;
    let updated = 0;
    let failed = 0;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < photos.length; i += CONCURRENCY) {
      const batch = photos.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map((photo, batchIndex) =>
          processPhoto(photo, i + batchIndex + 1, photos.length)
        )
      );

      for (const result of results) {
        processed++;
        if (result.status === 'fulfilled' && result.value) {
          updated++;
        } else {
          failed++;
        }
      }

      // Progress update every 50 photos
      if (processed % 50 < CONCURRENCY) {
        console.log(`\n📊 Progress: ${processed}/${photos.length} processed, ${updated} updated, ${failed} failed\n`);
      }

      // Small delay between batches to avoid overwhelming B2
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Backfill complete!');
    console.log(`📊 Final stats:`);
    console.log(`   - Total processed: ${processed}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - No EXIF data: ${failed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillExifDates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
