import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

// Create a new folder
export const createFolder = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params
		const { name, parentId } = req.body
		const photographerId = req.user!.id

		// Verify gallery exists and belongs to photographer
		const gallery = await prisma.gallery.findFirst({
			where: { id: galleryId, photographerId }
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		// If parentId is provided, verify it exists and belongs to the same gallery
		if (parentId) {
			const parentFolder = await prisma.folder.findFirst({
				where: { id: parentId, galleryId }
			})

			if (!parentFolder) {
				return res.status(404).json({
					success: false,
					error: 'Parent folder not found'
				})
			}
		}

		const folder = await prisma.folder.create({
			data: {
				name: name || "New Folder",
				galleryId,
				parentId: parentId || null
			},
			include: {
				photos: {
					include: {
						likedBy: true,
						favoritedBy: true,
						postBy: true
					}
				},
				children: true,
				coverPhoto: true
			}
		})

		res.status(201).json({
			success: true,
			data: folder
		})
	} catch (error) {
		console.error('Create folder error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Get folder tree structure for a gallery
export const getFolderTree = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params
		const userId = req.user!.id
		const userRole = req.user!.role

		// Check if user has access to this gallery
		let hasAccess = false

		if (userRole === 'PHOTOGRAPHER') {
			// Photographer owns the gallery
			const gallery = await prisma.gallery.findFirst({
				where: { id: galleryId, photographerId: userId }
			})
			hasAccess = !!gallery
		} else {
			// Client has explicit access
			const access = await prisma.galleryAccess.findUnique({
				where: { userId_galleryId: { userId, galleryId } }
			})
			hasAccess = !!access
		}

		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		// Get root folders (no parent)
		const rootFolders = await prisma.folder.findMany({
			where: { galleryId, parentId: null },
			include: {
				children: {
					include: {
						children: true, // For deeper nesting
						photos: {
							include: {
								likedBy: true,
								favoritedBy: true,
								postBy: true
							},
							orderBy: [
								{ capturedAt: 'asc' },
								{ createdAt: 'asc' }
							]
						},
						coverPhoto: true,
						_count: {
							select: { photos: true, children: true }
						}
					}
				},
				photos: {
					include: {
						likedBy: true,
						favoritedBy: true,
						postBy: true
					},
					orderBy: [
						{ capturedAt: 'asc' },
						{ createdAt: 'asc' }
					]
				},
				coverPhoto: true,
				_count: {
					select: { photos: true, children: true }
				}
			},
			orderBy: { createdAt: 'asc' }
		})

		res.json({
			success: true,
			data: rootFolders
		})
	} catch (error) {
		console.error('Get folder tree error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Get a specific folder with its contents
export const getFolder = async (req: AuthRequest, res: Response) => {
	try {
		const { folderId } = req.params
		const userId = req.user!.id
		const userRole = req.user!.role

		const folder = await prisma.folder.findUnique({
			where: { id: folderId },
			include: {
				children: {
					include: {
						photos: {
							select: {
								id: true,
								filename: true,
								thumbnailUrl: true
							}
						},
						coverPhoto: true,
						_count: {
							select: { photos: true, children: true }
						}
					}
				},
				photos: {
					include: {
						likedBy: true,
						favoritedBy: true,
						postBy: true
					},
					orderBy: [
						{ capturedAt: 'asc' },
						{ createdAt: 'asc' }
					]
				},
				coverPhoto: true,
				gallery: {
					select: {
						id: true,
						title: true,
						photographerId: true
					}
				}
			}
		})

		if (!folder) {
			return res.status(404).json({
				success: false,
				error: 'Folder not found'
			})
		}

		// Check access permissions
		let hasAccess = false

		if (userRole === 'PHOTOGRAPHER') {
			hasAccess = folder.gallery.photographerId === userId
		} else {
			const access = await prisma.galleryAccess.findUnique({
				where: { userId_galleryId: { userId, galleryId: folder.galleryId } }
			})
			hasAccess = !!access
		}

		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		res.json({
			success: true,
			data: folder
		})
	} catch (error) {
		console.error('Get folder error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Update folder (rename)
export const updateFolder = async (req: AuthRequest, res: Response) => {
	try {
		const { folderId } = req.params
		const { name } = req.body
		const photographerId = req.user!.id

		// Verify folder exists and belongs to photographer's gallery
		const folder = await prisma.folder.findFirst({
			where: { id: folderId },
			include: {
				gallery: true
			}
		})

		if (!folder) {
			return res.status(404).json({
				success: false,
				error: 'Folder not found'
			})
		}

		if (folder.gallery.photographerId !== photographerId) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		const updatedFolder = await prisma.folder.update({
			where: { id: folderId },
			data: { name },
			include: {
				photos: {
					include: {
						likedBy: true,
						favoritedBy: true,
						postBy: true
					}
				},
				children: true,
				coverPhoto: true
			}
		})

		res.json({
			success: true,
			data: updatedFolder
		})
	} catch (error) {
		console.error('Update folder error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Delete folder
export const deleteFolder = async (req: AuthRequest, res: Response) => {
	try {
		const { folderId } = req.params
		const photographerId = req.user!.id

		// Verify folder exists and belongs to photographer's gallery
		const folder = await prisma.folder.findFirst({
			where: { id: folderId },
			include: {
				gallery: true
			}
		})

		if (!folder) {
			return res.status(404).json({
				success: false,
				error: 'Folder not found'
			})
		}

		if (folder.gallery.photographerId !== photographerId) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		// Delete folder (cascade will handle photos and subfolders)
		await prisma.folder.delete({
			where: { id: folderId }
		})

		res.json({
			success: true,
			message: 'Folder deleted successfully'
		})
	} catch (error) {
		console.error('Delete folder error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Set folder cover photo
export const setFolderCover = async (req: AuthRequest, res: Response) => {
	try {
		const { folderId } = req.params
		const { photoId } = req.body
		const photographerId = req.user!.id

		// Verify folder exists and belongs to photographer's gallery
		const folder = await prisma.folder.findFirst({
			where: { id: folderId },
			include: {
				gallery: true
			}
		})

		if (!folder) {
			return res.status(404).json({
				success: false,
				error: 'Folder not found'
			})
		}

		if (folder.gallery.photographerId !== photographerId) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		// If photoId is provided, verify it exists in this folder
		if (photoId) {
			const photo = await prisma.photo.findFirst({
				where: { id: photoId, folderId }
			})

			if (!photo) {
				return res.status(404).json({
					success: false,
					error: 'Photo not found in this folder'
				})
			}
		}

		const updatedFolder = await prisma.folder.update({
			where: { id: folderId },
			data: { coverPhotoId: photoId || null },
			include: {
				coverPhoto: true
			}
		})

		res.json({
			success: true,
			data: updatedFolder
		})
	} catch (error) {
		console.error('Set folder cover error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Move folder to different parent (for reorganization)
export const moveFolder = async (req: AuthRequest, res: Response) => {
	try {
		const { folderId } = req.params
		const { newParentId } = req.body
		const photographerId = req.user!.id

		// Verify folder exists and belongs to photographer's gallery
		const folder = await prisma.folder.findFirst({
			where: { id: folderId },
			include: {
				gallery: true
			}
		})

		if (!folder) {
			return res.status(404).json({
				success: false,
				error: 'Folder not found'
			})
		}

		if (folder.gallery.photographerId !== photographerId) {
			return res.status(403).json({
				success: false,
				error: 'Access denied'
			})
		}

		// If newParentId is provided, verify it exists in the same gallery and isn't a descendant
		if (newParentId) {
			const parentFolder = await prisma.folder.findFirst({
				where: { id: newParentId, galleryId: folder.galleryId }
			})

			if (!parentFolder) {
				return res.status(404).json({
					success: false,
					error: 'Parent folder not found'
				})
			}

			// Prevent moving folder into its own descendant (would create circular reference)
			if (await isDescendant(folderId, newParentId)) {
				return res.status(400).json({
					success: false,
					error: 'Cannot move folder into its own descendant'
				})
			}
		}

		const updatedFolder = await prisma.folder.update({
			where: { id: folderId },
			data: { parentId: newParentId || null },
			include: {
				parent: true,
				children: true
			}
		})

		res.json({
			success: true,
			data: updatedFolder
		})
	} catch (error) {
		console.error('Move folder error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Helper function to check if a folder is a descendant of another
async function isDescendant(folderId: string, potentialAncestorId: string): Promise<boolean> {
	const descendants = await getAllDescendantIds(potentialAncestorId)
	return descendants.includes(folderId)
}

// Helper function to get all descendant folder IDs
async function getAllDescendantIds(folderId: string): Promise<string[]> {
	const children = await prisma.folder.findMany({
		where: { parentId: folderId },
		select: { id: true }
	})

	const descendantIds: string[] = children.map(child => child.id)

	for (const child of children) {
		const childDescendants = await getAllDescendantIds(child.id)
		descendantIds.push(...childDescendants)
	}

	return descendantIds
}

