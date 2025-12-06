/**
 * Backfill EXIF Capture Dates for Existing Photos
 * 
 * This script downloads existing photos from B2, extracts their EXIF capture dates,
 * and updates the database. Run this once after adding the capturedAt field.
 * 
 * Usage: npx ts-node scripts/backfill-exif-dates.ts
 */

import { PrismaClient } from '@prisma/client';
import { getObjectStreamFromS3 } from '../src/utils/s3Storage';

const prisma = new PrismaClient();

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function extractExifDate(photoUrl: string): Promise<Date | null> {
  try {
    // Parse B2 URL to get bucket and key
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    const bucketName = pathParts[0];
    const key = decodeURIComponent(pathParts.slice(1).join('/'));

    console.log(`  📥 Downloading from B2: ${key}`);

    // Download photo from B2
    const { stream } = await getObjectStreamFromS3(key, bucketName);
    const buffer = await streamToBuffer(stream);

    console.log(`  📊 Downloaded ${buffer.length} bytes`);

    // Extract EXIF data using sharp + exif-reader
    const sharp = require('sharp');
    const exifReader = require('exif-reader');

    const metadata = await sharp(buffer).metadata();

    if (metadata.exif) {
      const parsedExif = exifReader(metadata.exif);

      let capturedAt: Date | null = null;

      if (parsedExif.exif) {
        if (parsedExif.exif.DateTimeOriginal) {
          capturedAt = parsedExif.exif.DateTimeOriginal;
        } else if (parsedExif.exif.CreateDate) {
          capturedAt = parsedExif.exif.CreateDate;
        }
      }

      // Fallback to 'image' tags
      if (!capturedAt && parsedExif.image && parsedExif.image.DateTime) {
        capturedAt = parsedExif.image.DateTime;
      }

      if (capturedAt) {
        console.log(`  ✅ EXIF date found: ${capturedAt.toISOString()}`);
        return capturedAt;
      }
    }

    console.log(`  ⚠️ No EXIF date found`);
    return null;

  } catch (error) {
    console.error(`  ❌ Error extracting EXIF:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function backfillExifDates() {
  console.log('🚀 Starting EXIF date backfill...\n');

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
        createdAt: 'asc',
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

    for (const photo of photos) {
      processed++;
      console.log(`\n[${processed}/${photos.length}] Processing: ${photo.filename}`);

      try {
        const capturedAt = await extractExifDate(photo.originalUrl);

        if (capturedAt) {
          await prisma.photo.update({
            where: { id: photo.id },
            data: { capturedAt },
          });
          updated++;
          console.log(`  💾 Database updated`);
        } else {
          failed++;
        }

        // Add a small delay to avoid overwhelming B2
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Failed to process photo:`, error);
        failed++;
      }

      // Progress update every 50 photos
      if (processed % 50 === 0) {
        console.log(`\n📊 Progress: ${processed}/${photos.length} processed, ${updated} updated, ${failed} failed\n`);
      }
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
