import { Response } from 'express'
import { Request } from 'express'

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()



export const createClient = async (req: AuthRequest, res: Response) => {
	try {
		const { email, password, name } = req.body
		const photographerId = (req.user as any).id

		// Validate input
		if (!email || !password || !name) {
			return res.status(400).json({
				success: false,
				error: 'Email, password, and name are required'
			})
		}

		// Check if client already exists
		const existingClient = await prisma.user.findUnique({
			where: { email }
		})

		if (existingClient) {
			return res.status(400).json({
				success: false,
				error: 'Client with this email already exists'
			})
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12)

		// Create client
		const client = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role: 'CLIENT',
				photographerId
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		})

		res.status(201).json({
			success: true,
			data: { client }
		})
	} catch (error) {
		console.error('Create client error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const getClients = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = (req.user as any).id

		const clients = await prisma.user.findMany({
			where: { photographerId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				canDownload: true,
				feedbackRequestActive: true,
				feedbackRequestedAt: true
			}
		})

		res.json({
			success: true,
			data: { clients }
		})
	} catch (error) {
		console.error('Get clients error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const toggleClientDownload = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const { canDownload } = req.body
		const photographerId = (req.user as any).id

		// Verify the client belongs to this photographer
		const client = await prisma.user.findFirst({
			where: { id, photographerId, role: 'CLIENT' }
		})

		if (!client) {
			return res.status(404).json({
				success: false,
				error: 'Client not found or access denied'
			})
		}

		// Update the canDownload permission
		const updatedClient = await prisma.user.update({
			where: { id },
			data: { canDownload },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				canDownload: true
			}
		})

		res.json({
			success: true,
			data: { client: updatedClient }
		})
	} catch (error) {
		console.error('Toggle client download error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}



export const removeClient = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const photographerId = (req.user as any).id

		const client = await prisma.user.findFirst({
			where: { id, photographerId }
		})

		if (!client) {
			return res.status(404).json({
				success: false,
				error: 'Client not found or access denied'
			})
		}

		await prisma.user.delete({
			where: { id }
		})

		res.json({ success: true })
	} catch (error) {
		console.error('Remove client error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const getTotals = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = (req.user as any).id

		const [photos, galleries, clients] = await Promise.all([
			prisma.photo.count({ where: { folder: { gallery: { photographerId } } } }),
			prisma.gallery.count({ where: { photographerId } }),
			prisma.user.count({ where: { photographerId } })
		])

		res.json({ success: true, data: { photos, galleries, clients } })
	} catch (error) {
		console.error('Get totals error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}

export const getMostLikedPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = (req.user as any).id

		const photos = await prisma.photo.findMany({
			where: { folder: { gallery: { photographerId } } },
			orderBy: { likedBy: { _count: 'desc' } },
			take: 10,
			include: { _count: { select: { likedBy: true } } }
		})

		res.json({ success: true, data: photos })
	} catch (error) {
		console.error('Get most liked photos error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}

export const getMostFavoritedPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = (req.user as any).id

		const photos = await prisma.photo.findMany({
			where: { folder: { gallery: { photographerId } } },
			orderBy: { favoritedBy: { _count: 'desc' } },
			take: 10,
			include: { _count: { select: { favoritedBy: true } } }
		})

		res.json({ success: true, data: photos })
	} catch (error) {
		console.error('Get most favorited photos error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}

export const getMostViewedGalleries = async (req: AuthRequest, res: Response) => {
	try {
		const photographerId = (req.user as any).id

		const galleries = await prisma.gallery.findMany({
			where: { photographerId },
			orderBy: { downloadCount: 'desc' },
			take: 10
		})

		res.json({ success: true, data: galleries })
	} catch (error) {
		console.error('Get most viewed galleries error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}