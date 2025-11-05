import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { deleteFromS3 } from '../utils/s3Storage'
import jwt from 'jsonwebtoken'

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
				photographerId,
				folders: {
					create: {
						name: "Photos" // Default folder for the gallery
					}
				}
			},
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				},
				folders: true
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
		const userId = req.user!.id
		const userRole = req.user!.role

		// Admin can see all galleries, photographers only see their own
		const whereClause = userRole === 'ADMIN' ? {} : { photographerId: userId }

		const galleries = await prisma.gallery.findMany({
			where: whereClause,
			include: {
				photographer:
					userRole === 'ADMIN'
						? {
							select: { id: true, name: true, email: true }
						}
						: undefined,
				folders: {
					include: {
						photos: {
							select: {
								fileSize: true,
								_count: {
									select: {
										likedBy: true,
										favoritedBy: true
									}
								}
							}
						},
						coverPhoto: {
							select: {
								id: true,
								filename: true,
								thumbnailUrl: true,
								mediumUrl: true,
								largeUrl: true,
								originalUrl: true,
								createdAt: true
							}
						},
						_count: {
							select: { photos: true, children: true }
						}
					}
				},
				_count: {
					select: { folders: true }
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		const galleriesWithStats = galleries.map((gallery) => {
			let uniqueLikedPhotos = 0;
			let uniqueFavoritedPhotos = 0;

			const totalSize = gallery.folders.reduce((acc, folder) => {
				const folderSize = folder.photos.reduce((photoAcc, photo) => {
					// Count unique photos that have at least one like/favorite
					if (photo._count.likedBy > 0) {
						uniqueLikedPhotos++;
					}
					if (photo._count.favoritedBy > 0) {
						uniqueFavoritedPhotos++;
					}
					return photoAcc + (photo.fileSize || 0);
				}, 0);
				return acc + folderSize;
			}, 0);

			// remove photos from response to keep payload light
			gallery.folders.forEach(f => {
				// @ts-ignore
				delete f.photos;
			});

			return {
				...gallery,
				totalSize,
				_count: {
					...gallery._count,
					likedBy: uniqueLikedPhotos,
					favoritedBy: uniqueFavoritedPhotos,
				},
			};
		});

		res.json({
			success: true,
			data: galleriesWithStats
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
				folders: {
					where: { parentId: null }, // Only get root folders
					include: {
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
						children: {
							include: {
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
								children: true, // For deeper nesting
								coverPhoto: {
									select: {
										id: true,
										filename: true,
										thumbnailUrl: true,
										mediumUrl: true,
										largeUrl: true,
										originalUrl: true,
										createdAt: true
									}
								},
								_count: {
									select: { photos: true, children: true }
								}
							}
						},
						coverPhoto: {
							select: {
								id: true,
								filename: true,
								thumbnailUrl: true,
								mediumUrl: true,
								largeUrl: true,
								originalUrl: true,
								createdAt: true
							}
						},
						_count: {
							select: { photos: true, children: true }
						}
					}
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

		// If gallery is password-protected, enforce access rules
		if (gallery.password) {
			let isAuthorized = false

			// 1) If user is authenticated, allow if photographer owner or client with access
			const authHeader = req.headers['authorization']
			const token = authHeader && (authHeader as string).split(' ')[1]
			if (token) {
				try {
					const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
					const userId = decoded.userId as string

					// Photographer who owns the gallery
					if (decoded.role === 'PHOTOGRAPHER' && userId === gallery.photographerId) {
						isAuthorized = true
					} else {
						// Client with explicit access
						const hasAccess = await prisma.galleryAccess.findUnique({
							where: { userId_galleryId: { userId, galleryId: id } }
						})
						if (hasAccess) isAuthorized = true
					}
				} catch {
					// ignore token errors; will fall back to password header
				}
			}

			// 2) If not authorized yet, validate provided password (via header or query)
			if (!isAuthorized) {
				const providedPassword =
					(req.headers['x-gallery-password'] as string | undefined) ||
					(req.query.password as string | undefined)

				if (!providedPassword) {
					return res.status(401).json({ success: false, error: 'Password required' })
				}

				const isValidPassword = await bcrypt.compare(providedPassword, gallery.password)
				if (!isValidPassword) {
					return res.status(401).json({ success: false, error: 'Invalid password' })
				}
			}
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
		const userId = req.user!.id
		const userRole = req.user!.role

		// Check if gallery exists and user has permission to update it
		const whereClause = userRole === 'ADMIN' ? { id } : { id, photographerId: userId }
		const existingGallery = await prisma.gallery.findFirst({
			where: whereClause,
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				}
			}
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
				folders: true,
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
		const userId = req.user!.id
		const userRole = req.user!.role

		// Check if gallery exists and user has permission to delete it
		const whereClause = userRole === 'ADMIN' ? { id } : { id, photographerId: userId }
		const existingGallery = await prisma.gallery.findFirst({
			where: whereClause,
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				},
				folders: {
					include: {
						photos: true
					}
				}
			}
		})

		if (!existingGallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		// Delete all photos from S3 storage
		const allPhotos = existingGallery.folders.flatMap(folder => folder.photos)
		if (allPhotos.length > 0) {
			try {
				const deletePromises = allPhotos.map(async (photo) => {
					// Extract the S3 keys from the URLs
					const originalUrl = new URL(photo.originalUrl);

					// Split pathname and remove bucket name to get just the filename
					const originalPathParts = originalUrl.pathname.split('/');

					// Remove empty string and bucket name, keep the rest as the key
					const originalKey = originalPathParts.slice(2).join('/');

					const promises = [deleteFromS3(originalKey)]

					// Only delete thumbnail if it exists (may be null for pending thumbnails)
					if (photo.thumbnailUrl) {
						const thumbnailUrl = new URL(photo.thumbnailUrl);
						const thumbnailPathParts = thumbnailUrl.pathname.split('/');
						const thumbnailKey = thumbnailPathParts.slice(2).join('/');
						promises.push(deleteFromS3(thumbnailKey))
					}

					return Promise.all(promises)
				});

				await Promise.all(deletePromises);
				console.log(`Deleted ${allPhotos.length} photos from S3 for gallery ${id}`);
			} catch (storageError) {
				console.error('Storage deletion error during gallery deletion:', storageError);
				// Continue with database deletion even if storage fails
			}
		}

		// Delete gallery from database (this will cascade delete photos due to foreign key)
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

export const likeGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		const existingLike = await prisma.likedGallery.findUnique({
			where: { userId_galleryId: { userId, galleryId: id } },
		});

		if (existingLike) {
			return res.status(400).json({ success: false, error: 'Gallery already liked' });
		}

		await prisma.likedGallery.create({
			data: { userId, galleryId: id },
		});

		res.json({ success: true, message: 'Gallery liked' });
	} catch (error) {
		console.error('Like gallery error:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

export const unlikeGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		await prisma.likedGallery.delete({
			where: { userId_galleryId: { userId, galleryId: id } },
		});

		res.json({ success: true, message: 'Gallery unliked' });
	} catch (error) {
		console.error('Unlike gallery error:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

export const favoriteGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		const existingFavorite = await prisma.favoritedGallery.findUnique({
			where: { userId_galleryId: { userId, galleryId: id } },
		});

		if (existingFavorite) {
			return res.status(400).json({ success: false, error: 'Gallery already favorited' });
		}

		await prisma.favoritedGallery.create({
			data: { userId, galleryId: id },
		});

		res.json({ success: true, message: 'Gallery favorited' });
	} catch (error) {
		console.error('Favorite gallery error:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

export const unfavoriteGallery = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		await prisma.favoritedGallery.delete({
			where: { userId_galleryId: { userId, galleryId: id } },
		});

		res.json({ success: true, message: 'Gallery unfavorited' });
	} catch (error) {
		console.error('Unfavorite gallery error:', error);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
};

export const updateGalleryAccess = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const { clientIds, access } = req.body // access is a boolean
		const userId = req.user!.id
		const userRole = req.user!.role

		// Verify gallery exists and user has permission to modify access
		const whereClause = userRole === 'ADMIN' ? { id } : { id, photographerId: userId }
		const gallery = await prisma.gallery.findFirst({
			where: whereClause,
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				}
			}
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		if (access) {
			await prisma.galleryAccess.createMany({
				data: clientIds.map((clientId: string) => ({
					galleryId: id,
					userId: clientId
				})),
				skipDuplicates: true
			})
		} else {
			await prisma.galleryAccess.deleteMany({
				where: {
					galleryId: id,
					userId: { in: clientIds }
				}
			})
		}

		res.json({ success: true })
	} catch (error) {
		console.error('Update gallery access error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}

export const getAllowedClients = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user!.id
		const userRole = req.user!.role

		// Verify gallery exists and user has permission to view access
		const whereClause = userRole === 'ADMIN' ? { id } : { id, photographerId: userId }
		const gallery = await prisma.gallery.findFirst({
			where: whereClause,
			include: {
				photographer: {
					select: { id: true, name: true, email: true }
				}
			}
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		const clients = await prisma.galleryAccess.findMany({
			where: { galleryId: id },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true
					}
				}
			}
		})

		res.json({ success: true, data: clients })
	} catch (error) {
		console.error('Get allowed clients error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}

export const getClientGalleries = async (req: AuthRequest, res: Response) => {
	try {
		const clientId = req.user!.id

		// Get galleries that the client has access to
		const accessibleGalleries = await prisma.galleryAccess.findMany({
			where: { userId: clientId },
			include: {
				gallery: {
					include: {
						photographer: {
							select: { id: true, name: true, email: true }
						},
						folders: {
							include: {
								photos: {
									include: {
										likedBy: true,
										favoritedBy: true,
										postBy: true
									}
								},
								children: true,
								coverPhoto: {
									select: {
										id: true,
										filename: true,
										thumbnailUrl: true,
										mediumUrl: true,
										largeUrl: true,
										originalUrl: true,
										createdAt: true
									}
								},
								_count: {
									select: { photos: true, children: true }
								}
							}
						},
						likedBy: true,
						favoritedBy: true,
						_count: {
							select: { folders: true }
						}
					}
				}
			},
			orderBy: {
				gallery: {
					createdAt: 'desc'
				}
			}
		})

		// Transform the data to match the expected format
		const galleries = accessibleGalleries.map((access) => {
			let uniqueLikedPhotos = 0;
			let uniqueFavoritedPhotos = 0;

			// Calculate total photo count and count unique photos with likes/favorites
			const totalPhotoCount = access.gallery.folders.reduce((sum, folder) => {
				folder.photos.forEach(photo => {
					// Count unique photos that have at least one like/favorite
					if (photo.likedBy.length > 0) {
						uniqueLikedPhotos++;
					}
					if (photo.favoritedBy.length > 0) {
						uniqueFavoritedPhotos++;
					}
				});
				return sum + folder._count.photos;
			}, 0);

			// Remove photos from response to keep payload light
			access.gallery.folders.forEach(f => {
				// @ts-ignore
				delete f.photos;
			});

			return {
				...access.gallery,
				photoCount: totalPhotoCount,
				isExpired: access.gallery.expiresAt ? new Date(access.gallery.expiresAt) < new Date() : false,
				_count: {
					...access.gallery._count,
					likedBy: uniqueLikedPhotos,
					favoritedBy: uniqueFavoritedPhotos,
				}
			}
		})

		res.json({
			success: true,
			data: galleries
		})
	} catch (error) {
		console.error('Get client galleries error:', error)
		res.status(500).json({ success: false, error: 'Internal server error' })
	}
}
