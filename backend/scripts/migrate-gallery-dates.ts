import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Data migration script to populate shootDate, shootYear, and shootMonth
 * for existing galleries using their createdAt timestamp
 */
async function migrateGalleryDates() {
    console.log('🔄 Starting gallery date migration...')

    try {
        // Get all galleries without shootDate
        const galleries = await prisma.gallery.findMany({
            where: {
                shootDate: null,
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
        })

        console.log(`📊 Found ${galleries.length} galleries without shoot dates`)

        if (galleries.length === 0) {
            console.log('✅ No galleries to migrate')
            return
        }

        // Update each gallery with date fields derived from createdAt
        let successCount = 0
        let errorCount = 0

        for (const gallery of galleries) {
            try {
                const shootDate = gallery.createdAt
                const shootYear = shootDate.getFullYear()
                const shootMonth = shootDate.getMonth() + 1 // JavaScript months are 0-indexed

                await prisma.gallery.update({
                    where: { id: gallery.id },
                    data: {
                        shootDate,
                        shootYear,
                        shootMonth,
                    },
                })

                successCount++
                console.log(
                    `✓ Updated "${gallery.title}" - ${shootYear}-${String(shootMonth).padStart(2, '0')}`
                )
            } catch (error) {
                errorCount++
                console.error(`✗ Failed to update "${gallery.title}":`, error)
            }
        }

        console.log('\n📈 Migration Summary:')
        console.log(`   ✅ Successfully migrated: ${successCount}`)
        console.log(`   ❌ Failed: ${errorCount}`)
        console.log(`   📊 Total processed: ${galleries.length}`)
    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Run the migration
migrateGalleryDates()
    .then(() => {
        console.log('\n✅ Migration completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error)
        process.exit(1)
    })
