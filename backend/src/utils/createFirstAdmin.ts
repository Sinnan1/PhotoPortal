import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

/**
 * Script to create the first admin account
 * Can be run via environment variables or interactively
 */
async function createFirstAdmin() {
	try {
		// Check if any admin already exists
		const existingAdmin = await prisma.user.findFirst({
			where: { role: 'ADMIN' }
		})

		if (existingAdmin) {
			console.log('❌ Admin account already exists!')
			console.log(`📧 Admin email: ${existingAdmin.email}`)
			console.log('Use the existing admin account or delete it first.')
			return
		}

		// Get admin details from environment variables
		const adminEmail = process.env.FIRST_ADMIN_EMAIL
		const adminPassword = process.env.FIRST_ADMIN_PASSWORD
		const adminName = process.env.FIRST_ADMIN_NAME || 'System Administrator'

		if (!adminEmail || !adminPassword) {
			console.log('❌ Missing required environment variables:')
			console.log('   FIRST_ADMIN_EMAIL - Email for the first admin account')
			console.log('   FIRST_ADMIN_PASSWORD - Password for the first admin account')
			console.log('   FIRST_ADMIN_NAME - Name for the admin (optional, defaults to "System Administrator")')
			console.log('')
			console.log('Example:')
			console.log('   FIRST_ADMIN_EMAIL=admin@yarrowweddings.com')
			console.log('   FIRST_ADMIN_PASSWORD=SecureAdminPassword123!')
			console.log('   FIRST_ADMIN_NAME="Yarrow Admin"')
			return
		}

		// Validate password strength
		if (adminPassword.length < 12) {
			console.log('❌ Admin password must be at least 12 characters long')
			return
		}

		// Check if user with this email already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: adminEmail }
		})

		if (existingUser) {
			console.log('❌ User with this email already exists!')
			console.log('Choose a different email or delete the existing user first.')
			return
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(adminPassword, 12)

		// Create the admin user
		const admin = await prisma.user.create({
			data: {
				email: adminEmail,
				password: hashedPassword,
				name: adminName,
				role: 'ADMIN'
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		})

		// Log the creation in audit logs
		await prisma.adminAuditLog.create({
			data: {
				adminId: admin.id,
				action: 'FIRST_ADMIN_CREATED',
				targetType: 'user',
				targetId: admin.id,
				details: {
					email: admin.email,
					name: admin.name,
					createdBy: 'SYSTEM_SCRIPT',
					timestamp: new Date().toISOString()
				}
			}
		})

		console.log('✅ First admin account created successfully!')
		console.log('📧 Email:', admin.email)
		console.log('👤 Name:', admin.name)
		console.log('🔑 Role:', admin.role)
		console.log('📅 Created:', admin.createdAt.toISOString())
		console.log('')
		console.log('🔐 You can now login to the admin panel with these credentials.')
		console.log('⚠️  Make sure to change the password after first login!')

	} catch (error) {
		console.error('❌ Failed to create first admin account:', error)
		if (error instanceof Error) {
			console.error('Error details:', error.message)
		}
	} finally {
		await prisma.$disconnect()
	}
}

/**
 * Check if first admin setup is needed
 */
export async function checkFirstAdminSetup(): Promise<boolean> {
	try {
		const adminCount = await prisma.user.count({
			where: { role: 'ADMIN' }
		})
		return adminCount === 0
	} catch (error) {
		console.error('Failed to check admin setup:', error)
		return false
	}
}

/**
 * Get admin setup status for API endpoint
 */
export async function getAdminSetupStatus() {
	try {
		const needsSetup = await checkFirstAdminSetup()
		const totalUsers = await prisma.user.count()
		const adminCount = await prisma.user.count({
			where: { role: 'ADMIN' }
		})

		return {
			needsFirstAdminSetup: needsSetup,
			totalUsers,
			adminCount,
			setupComplete: !needsSetup
		}
	} catch (error) {
		console.error('Failed to get admin setup status:', error)
		return {
			needsFirstAdminSetup: true,
			totalUsers: 0,
			adminCount: 0,
			setupComplete: false,
			error: 'Failed to check setup status'
		}
	}
}

// Run the script if called directly
if (require.main === module) {
	createFirstAdmin()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('Script failed:', error)
			process.exit(1)
		})
}

export { createFirstAdmin }