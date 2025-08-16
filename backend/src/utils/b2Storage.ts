import B2 from 'backblaze-b2'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// Initialize B2 client with native API
const b2Client = new B2({
	applicationKeyId: process.env.AWS_ACCESS_KEY_ID!, // B2 uses same key ID
	applicationKey: process.env.AWS_SECRET_ACCESS_KEY!, // B2 uses same secret key
})

let b2Authorized = false
let bucketId: string | null = null

// Authorize B2 client and get bucket info
const authorizeB2 = async (): Promise<void> => {
	if (b2Authorized && bucketId) return

	try {
		await b2Client.authorize()
		b2Authorized = true
		
		// Get bucket ID from bucket name
		const buckets = await b2Client.listBuckets()
		const bucket = buckets.data.buckets.find((b: any) => b.bucketName === process.env.S3_BUCKET_NAME!)
		
		if (!bucket) {
			throw new Error(`Bucket ${process.env.S3_BUCKET_NAME} not found`)
		}
		
		bucketId = bucket.bucketId
		console.log(`B2 authorized successfully. Bucket ID: ${bucketId}`)
	} catch (error) {
		console.error('B2 authorization failed:', error)
		throw error
	}
}

// Enhanced delete function using native B2 API
export const deleteFromB2 = async (filename: string): Promise<void> => {
	try {
		await authorizeB2()
		
		if (!bucketId) {
			throw new Error('Bucket ID not available')
		}

		// List file versions to get the file ID
		const fileVersions = await b2Client.listFileVersions({
			bucketId,
			startFileName: filename,
			startFileId: '',
			maxFileCount: 1
		})

		// Find exact match for the filename
		const fileVersion = fileVersions.data.files.find((file: any) => file.fileName === filename)
		
		if (!fileVersion) {
			console.log(`File not found for deletion: ${filename}`)
			return // File doesn't exist, consider it successfully deleted
		}

		// Delete the specific file version using native B2 API
		await b2Client.deleteFileVersion({
			fileId: fileVersion.fileId,
			fileName: fileVersion.fileName
		})

		console.log(`Successfully deleted: ${filename} (fileId: ${fileVersion.fileId})`)
	} catch (error) {
		console.error('B2 delete error:', {
			message: (error as Error)?.message,
			filename,
			stack: (error as Error)?.stack
		})
		
		// Don't throw error if file doesn't exist
		if ((error as any)?.response?.data?.code === 'file_not_found') {
			console.log(`File already deleted or not found: ${filename}`)
			return
		}
		
		throw new Error(`Failed to delete ${filename} from B2 storage: ${(error as Error)?.message}`)
	}
}

// Batch delete function for better performance with native B2 API
export const batchDeleteFromB2 = async (filenames: string[]): Promise<void> => {
	if (filenames.length === 0) return

	try {
		await authorizeB2()
		
		if (!bucketId) {
			throw new Error('Bucket ID not available')
		}

		// Process files in smaller batches to avoid overwhelming the API
		const batchSize = 10
		const results = []

		for (let i = 0; i < filenames.length; i += batchSize) {
			const batch = filenames.slice(i, i + batchSize)
			console.log(`Processing B2 delete batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filenames.length/batchSize)}`)
			
			const batchPromises = batch.map(filename => 
				deleteFromB2(filename).catch(error => {
					console.warn(`Failed to delete ${filename}:`, error.message)
					return { filename, error: error.message, success: false }
				}).then(() => ({ filename, success: true }))
			)
			
			const batchResults = await Promise.all(batchPromises)
			results.push(...batchResults)
			
			// Small delay between batches to be respectful to the API
			if (i + batchSize < filenames.length) {
				await new Promise(resolve => setTimeout(resolve, 100))
			}
		}

		const successful = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length
		
		console.log(`Batch delete completed: ${successful} successful, ${failed} failed`)
	} catch (error) {
		console.error('Batch delete from B2 failed:', error)
		throw error
	}
}

// Helper function to get file info from B2 (useful for debugging)
export const getB2FileInfo = async (filename: string): Promise<any> => {
	try {
		await authorizeB2()
		
		if (!bucketId) {
			throw new Error('Bucket ID not available')
		}

		const fileVersions = await b2Client.listFileVersions({
			bucketId,
			startFileName: filename,
			startFileId: '',
			maxFileCount: 1
		})

		return fileVersions.data.files.find((file: any) => file.fileName === filename) || null
	} catch (error) {
		console.error('Failed to get B2 file info:', error)
		return null
	}
}

// Function to list all files in a directory (useful for cleanup operations)
export const listB2Files = async (prefix: string, maxCount: number = 1000): Promise<any[]> => {
	try {
		await authorizeB2()
		
		if (!bucketId) {
			throw new Error('Bucket ID not available')
		}

		const fileVersions = await b2Client.listFileVersions({
			bucketId,
			startFileName: '',
			startFileId: '',
			maxFileCount: maxCount
		})

		return fileVersions.data.files
	} catch (error) {
		console.error('Failed to list B2 files:', error)
		return []
	}
}

// Re-export upload functions from s3Storage for now (these can be migrated later if needed)
export { uploadToS3, generateMultipleThumbnails } from './s3Storage'