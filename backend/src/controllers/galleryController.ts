import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

export const createGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { title, description, password, expiresAt, downloadLimit } = req.body
		const photographerId = req.user!.id

		// Validate input
		if (!title) {
			return res.status(400).json({
				success: false,
				error: 'Gallery title is required'
			})
		}

		// Hash password if provided
		let hashedPassword = null
		if (password) {
			hashedPassword = await bcrypt.hash(password, 12)
		}

		// Parse expiry date if provided
		let expiryDate = null
		if (expiresAt) {
			expiryDate = new Date(expiresAt)
			if (expiryDate < new Date()) {
				return res.status(400).json({
					success: false,
					error: 'Expiry date cannot be in the past'
				})
			}
		}

		const gallery = await prisma.gallery.create({
			data: {
				title,
				description,
				password: hashedPassword,
				expiresAt: expiryDate,
				downloadLimit: downloadLimit || 0,
				photographerId
			},
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				},
				photos: true
			}
		})

		res.status(201).json({
			success: true,
			data: gallery
		})
	} catch (error) {
		console.error('Create gallery error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const getGalleries = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = req.user!.id

		const galleries = await prisma.gallery.findMany({
			where: { photographerId },
			include: {
				photos: {
					select: {
						id: true,
						filename: true,
						thumbnailUrl: true,
						createdAt: true
					}
				},
				_count: {
					select: { photos: true }
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		res.json({
			success: true,
			data: galleries
		})
	} catch (error) {
		console.error('Get galleries error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const getGallery = async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const gallery = await prisma.gallery.findUnique({
			where: { id },
			include: {
				photos: {
					orderBy: { createdAt: 'desc' }
				},
				photographer: {
					select: { name: true }
				}
			}
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found'
			})
		}

		// Check if gallery has expired
		if (gallery.expiresAt && gallery.expiresAt < new Date()) {
			return res.status(410).json({
				success: false,
				error: 'Gallery has expired'
			})
		}

		res.json({
			success: true,
			data: gallery
		})
	} catch (error) {
		console.error('Get gallery error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const verifyGalleryPassword = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { password } = req.body

		const gallery = await prisma.gallery.findUnique({
			where: { id },
			select: { password: true }
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found'
			})
		}

		if (!gallery.password) {
			return res.json({
				success: true,
				message: 'Gallery is not password protected'
			})
		}

		if (!password) {
			return res.status(400).json({
				success: false,
				error: 'Password is required'
			})
		}

		const isValidPassword = await bcrypt.compare(password, gallery.password)

		if (!isValidPassword) {
			return res.status(401).json({
				success: false,
				error: 'Invalid password'
			})
		}

		res.json({
			success: true,
			message: 'Password verified'
		})
	} catch (error) {
		console.error('Verify password error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const updateGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const { title, description, password, expiresAt, downloadLimit } = req.body
		const photographerId = req.user!.id

		// Check if gallery exists and belongs to photographer
		const existingGallery = await prisma.gallery.findFirst({
			where: { id, photographerId }
		})

		if (!existingGallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		// Prepare update data
		const updateData: any = {}
		if (title !== undefined) updateData.title = title
		if (description !== undefined) updateData.description = description
		if (downloadLimit !== undefined) updateData.downloadLimit = downloadLimit

		// Handle password update
		if (password !== undefined) {
			updateData.password = password ? await bcrypt.hash(password, 12) : null
		}

		// Handle expiry date
		if (expiresAt !== undefined) {
			if (expiresAt) {
				const expiryDate = new Date(expiresAt)
				if (expiryDate < new Date()) {
					return res.status(400).json({
						success: false,
						error: 'Expiry date cannot be in the past'
					})
				}
				updateData.expiresAt = expiryDate
			} else {
				updateData.expiresAt = null
			}
		}

		const gallery = await prisma.gallery.update({
			where: { id },
			data: updateData,
			include: {
				photos: true,
				photographer: {
					select: { name: true }
				}
			}
		})

		res.json({
			success: true,
			data: gallery
		})
	} catch (error) {
		console.error('Update gallery error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const deleteGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const photographerId = req.user!.id

		// Check if gallery exists and belongs to photographer
		const existingGallery = await prisma.gallery.findFirst({
			where: { id, photographerId }
		})

		if (!existingGallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		await prisma.gallery.delete({
			where: { id }
		})

		res.json({
			success: true,
			message: 'Gallery deleted successfully'
		})
	} catch (error) {
		console.error('Delete gallery error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}