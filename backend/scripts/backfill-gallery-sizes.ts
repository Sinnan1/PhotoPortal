/**
 * Backfill script to populate totalSize for existing galleries.
 * Run with: npx ts-node scripts/backfill-gallery-sizes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillGallerySizes() {
    console.log('🚀 Starting gallery size backfill...');

    // Get all galleries
    const galleries = await prisma.gallery.findMany({
        select: { id: true, title: true }
    });

    console.log(`📊 Found ${galleries.length} galleries to process`);

    let processed = 0;
    let updated = 0;

    for (const gallery of galleries) {
        try {
            // Calculate total size from all photos in all folders
            const result = await prisma.photo.aggregate({
                where: {
                    folder: {
                        galleryId: gallery.id
                    }
                },
                _sum: {
                    fileSize: true
                }
            });

            const totalSize = result._sum.fileSize || 0;

            // Update gallery with calculated total size
            await prisma.gallery.update({
                where: { id: gallery.id },
                data: { totalSize: BigInt(totalSize) }
            });

            if (totalSize > 0) {
                updated++;
                console.log(`✅ ${gallery.title}: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            }

            processed++;

            // Progress log every 10 galleries
            if (processed % 10 === 0) {
                console.log(`📈 Progress: ${processed}/${galleries.length}`);
            }
        } catch (error) {
            console.error(`❌ Error processing gallery ${gallery.id}:`, error);
        }
    }

    console.log(`\n✨ Backfill complete!`);
    console.log(`   Processed: ${processed} galleries`);
    console.log(`   Updated: ${updated} galleries with size > 0`);
}

backfillGallerySizes()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
