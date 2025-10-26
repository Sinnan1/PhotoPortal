/**
 * Migration Script: Update Existing Photos
 * 
 * This script updates existing photos in the database to work with the new
 * async thumbnail system. It sets thumbnailStatus and uploadStatus for all
 * existing photos.
 * 
 * Run with: npx ts-node src/scripts/migrateExistingPhotos.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateExistingPhotos() {
  console.log('🔄 Starting photo migration...')
  console.log('━'.repeat(50))
  
  try {
    // Count total photos
    const totalPhotos = await prisma.photo.count()
    console.log(`📊 Total photos in database: ${totalPhotos}`)
    
    if (totalPhotos === 0) {
      console.log('✅ No photos to migrate')
      return
    }
    
    // Update all existing photos to have COMPLETED status
    // (since they already have thumbnails)
    console.log('\n🔄 Setting status for existing photos...')
    const result = await prisma.photo.updateMany({
      data: {
        thumbnailStatus: 'COMPLETED',
        uploadStatus: 'COMPLETED'
      }
    })
    
    console.log(`✅ Updated ${result.count} photos with COMPLETED status`)
    
    // Find photos with missing thumbnails
    console.log('\n🔍 Checking for photos with missing thumbnails...')
    const photosWithoutThumbnails = await prisma.photo.findMany({
      where: {
        OR: [
          { thumbnailUrl: null },
          { thumbnailUrl: '' }
        ]
      },
      select: {
        id: true,
        filename: true,
        originalUrl: true,
        folder: {
          select: {
            id: true,
            name: true,
            gallery: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })
    
    if (photosWithoutThumbnails.length > 0) {
      console.log(`⚠️  Found ${photosWithoutThumbnails.length} photos without thumbnails:`)
      console.log('━'.repeat(50))
      
      photosWithoutThumbnails.slice(0, 10).forEach((photo, index) => {
        console.log(`${index + 1}. ${photo.filename}`)
        console.log(`   Gallery: ${photo.folder.gallery.title}`)
        console.log(`   Folder: ${photo.folder.name}`)
        console.log(`   ID: ${photo.id}`)
        console.log('')
      })
      
      if (photosWithoutThumbnails.length > 10) {
        console.log(`   ... and ${photosWithoutThumbnails.length - 10} more`)
      }
      
      console.log('\n💡 These photos will need thumbnail regeneration.')
      console.log('   You can regenerate them by:')
      console.log('   1. Using the thumbnail queue service')
      console.log('   2. Re-uploading the photos')
      console.log('   3. Running a thumbnail regeneration script')
      
      // Mark these as FAILED so they can be retried
      await prisma.photo.updateMany({
        where: {
          OR: [
            { thumbnailUrl: null },
            { thumbnailUrl: '' }
          ]
        },
        data: {
          thumbnailStatus: 'FAILED'
        }
      })
      
      console.log(`\n✅ Marked ${photosWithoutThumbnails.length} photos as FAILED for retry`)
    } else {
      console.log('✅ All photos have thumbnails')
    }
    
    // Summary
    console.log('\n' + '━'.repeat(50))
    console.log('📊 Migration Summary:')
    console.log(`   Total photos: ${totalPhotos}`)
    console.log(`   Updated: ${result.count}`)
    console.log(`   Missing thumbnails: ${photosWithoutThumbnails.length}`)
    console.log('━'.repeat(50))
    console.log('\n✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateExistingPhotos()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
