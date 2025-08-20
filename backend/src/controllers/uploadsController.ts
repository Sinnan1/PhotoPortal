import { Request, Response } from 'express'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
	region: 'us-east-005',
	endpoint: 'https://s3.us-east-005.backblazeb2.com',
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
	}
})

export const createMultipartUpload = async (req: Request, res: Response) => {
	try {
		const { filename, contentType } = req.body
		
		const command = new CreateMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: filename,
			ContentType: contentType
		})
		
		const result = await s3Client.send(command)
		
		res.json({
			uploadId: result.UploadId,
			key: result.Key
		})
	} catch (error) {
		console.error('Create multipart upload error:', error)
		res.status(500).json({ error: 'Failed to create multipart upload' })
	}
}

export const signMultipartPart = async (req: Request, res: Response) => {
	try {
		const { key, uploadId, partNumber } = req.query
		
		const command = new UploadPartCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: key as string,
			UploadId: uploadId as string,
			PartNumber: parseInt(partNumber as string)
		})
		
		const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
		
		res.json({ signedUrl })
	} catch (error) {
		console.error('Sign multipart part error:', error)
		res.status(500).json({ error: 'Failed to sign multipart part' })
	}
}

export const completeMultipartUpload = async (req: Request, res: Response) => {
	try {
		const { key, uploadId, parts } = req.body
		
		const command = new CompleteMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: key,
			UploadId: uploadId,
			MultipartUpload: {
				Parts: parts
			}
		})
		
		const result = await s3Client.send(command)
		
		res.json({
			location: result.Location,
			bucket: result.Bucket,
			key: result.Key,
			etag: result.ETag
		})
	} catch (error) {
		console.error('Complete multipart upload error:', error)
		res.status(500).json({ error: 'Failed to complete multipart upload' })
	}
}

export const uploadPartProxy = async (req: Request, res: Response) => {
	try {
		const { url } = req.query
		
		if (!url || typeof url !== 'string') {
			return res.status(400).json({ error: 'URL parameter is required' })
		}
		
		const response = await fetch(url, {
			method: 'PUT',
			body: req.body,
			headers: {
				'Content-Type': req.headers['content-type'] || 'application/octet-stream'
			}
		})
		
		if (!response.ok) {
			throw new Error(`Upload failed with status: ${response.status}`)
		}
		
		const etag = response.headers.get('etag')
		
		res.json({ etag })
	} catch (error) {
		console.error('Upload part proxy error:', error)
		res.status(500).json({ error: 'Failed to upload part' })
	}
}
