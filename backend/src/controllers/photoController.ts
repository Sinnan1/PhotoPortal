/**
 * Photo Controller - Unified Download API Endpoints
 *
 * This controller provides unified server-side download endpoints for all photo download types.
 * All downloads now use server-side processing with Archiver instead of client-side JSZip.
 *
 * Download Endpoints:
 * - GET /photos/gallery/:galleryId/download/all - Download all photos in gallery
 * - GET /photos/gallery/:galleryId/download/folder/:folderId - Download photos in folder
 * - GET /photos/gallery/:galleryId/download/liked - Download user's liked photos
 * - GET /photos/gallery/:galleryId/download/favorited - Download user's favorited photos
 *
 * All endpoints support:
 * - Real-time progress tracking via download IDs
 * - Direct S3 streaming for memory efficiency
 * - Consistent error handling and recovery
 * - Authentication and authorization
 *
 * Migration Notes:
 * - Replaced client-side JSZip with server-side Archiver
 * - Unified progress tracking across all download types
 * - Improved memory usage and scalability
 *
 * @since Server-side download migration completed
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import archiver from "archiver";
import {
	uploadToS3,
	deleteFromS3,
	getObjectStreamFromS3,
} from "../utils/s3Storage";
import { DownloadService } from "../services/downloadService";
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
	user?: {
		id: string;
		email: string;
		role: string;
	};
}

// DEPRECATED: Old upload middleware - replaced by direct B2 multipart upload
// This is kept for backward compatibility but should be removed in future versions
export const uploadMiddleware = (req: any, res: any, next: any) => {
	res.status(410).json({
		success: false,
		error:
			"This upload method is deprecated. Please use the new direct B2 upload system.",
	});
};

// Helper function to clean up temp files after upload
export const cleanupTempFiles = async (filePaths: string[]) => {
	const cleanupPromises = filePaths.map(async (filePath) => {
		try {
			await fs.unlink(filePath);
			console.log(`Cleaned up temp file: ${filePath}`);
		} catch (error) {
			console.warn(`Failed to cleanup temp file ${filePath}:`, error);
		}
	});

	await Promise.allSettled(cleanupPromises);
};

// Middleware to handle multer errors gracefully
export const handleUploadErrors = (
	error: any,
	req: any,
	res: any,
	next: any
) => {
	if (error instanceof multer.MulterError) {
		if (error.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({
				success: false,
				error: "File too large. Maximum size is 50MB per file.",
			});
		}
		if (error.code === "LIMIT_FILE_COUNT") {
			return res.status(400).json({
				success: false,
				error: "Too many files. Maximum is 50 files per batch.",
			});
		}
		if (error.code === "LIMIT_UNEXPECTED_FILE") {
			return res.status(400).json({
				success: false,
				error: 'Unexpected file field. Use "photos" field name.',
			});
		}
	}

	if (error.message.includes("Invalid file type")) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}

	// Generic upload error
	return res.status(500).json({
		success: false,
		error: "Upload failed. Please try again.",
	});
};
// DEPRECATED: This function is no longer used - replaced by direct B2 multipart upload
// Kept for backward compatibility but should be removed in future versions
export const uploadPhotos = async (req: AuthRequest, res: Response) => {
	res.status(410).json({
		success: false,
		error:
			"This upload method is deprecated. Please use the new direct B2 upload system.",
	});
};

// Add batch upload endpoint for better performance
export const batchUploadPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params;
		const photographerId = req.user!.id;

		// Verify gallery
		const gallery = await prisma.gallery.findFirst({
			where: { id: galleryId, photographerId },
		});

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: "Gallery not found or access denied",
			});
		}

		// Return upload configuration for client
		res.json({
			success: true,
			data: {
				uploadUrl: `/api/photos/upload/${galleryId}`,
				maxFileSize: 200 * 1024 * 1024, // 200MB
				maxFiles: 50,
				supportedFormats: [
					"JPEG",
					"PNG",
					"WebP",
					"TIFF",
					"CR2",
					"CR3",
					"NEF",
					"ARW",
					"DNG",
					"ORF",
					"RW2",
				],
			},
		});
	} catch (error) {
		console.error("Batch upload config error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Keep existing functions but add better error handling
export const getPhotos = async (req: Request, res: Response) => {
	try {
		const { galleryId } = req.params;
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 24; // Good for grid display

		const skip = (page - 1) * limit;

		// First, check if gallery exists and get its access information
		const gallery = await prisma.gallery.findUnique({
			where: { id: galleryId },
			select: {
				id: true,
				password: true,
				photographerId: true,
				expiresAt: true,
				title: true,
			},
		});

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: "Gallery not found",
			});
		}

		// Check if gallery has expired
		if (gallery.expiresAt && gallery.expiresAt < new Date()) {
			return res.status(410).json({
				success: false,
				error: "Gallery has expired",
			});
		}

		// Check gallery access permissions
		if (gallery.password) {
			let isAuthorized = false;

			// 1) If user is authenticated, allow if photographer owner or client with access
			const authHeader = req.headers["authorization"];
			const token = authHeader && (authHeader as string).split(" ")[1];
			if (token) {
				try {
					const jwt = await import("jsonwebtoken");
					const decoded = jwt.default.verify(
						token,
						process.env.JWT_SECRET!
					) as any;
					const userId = decoded.userId as string;

					// Photographer who owns the gallery
					if (
						decoded.role === "PHOTOGRAPHER" &&
						userId === gallery.photographerId
					) {
						isAuthorized = true;
					} else {
						// Client with explicit access
						const hasAccess = await prisma.galleryAccess.findUnique({
							where: { userId_galleryId: { userId, galleryId } },
						});
						if (hasAccess) isAuthorized = true;
					}
				} catch {
					// ignore token errors; will fall back to password header
				}
			}

			// 2) If not authorized yet, validate provided password (via header or query)
			if (!isAuthorized) {
				const providedPassword =
					(req.headers["x-gallery-password"] as string | undefined) ||
					(req.query.password as string | undefined);

				if (!providedPassword) {
					return res
						.status(401)
						.json({ success: false, error: "Password required" });
				}

				const isValidPassword = await (
					await import("bcryptjs")
				).default.compare(providedPassword, gallery.password);
				if (!isValidPassword) {
					return res
						.status(401)
						.json({ success: false, error: "Invalid password" });
				}
			}
		}

		const [photos, total] = await Promise.all([
			prisma.photo.findMany({
				where: {
					folder: {
						galleryId,
					},
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
				include: {
					likedBy: true,
					favoritedBy: true,
					postBy: true,
				} as any,
			}),
			prisma.photo.count({
				where: {
					folder: {
						galleryId,
					},
				},
			}),
		]);

		res.json({
			success: true,
			data: {
				photos,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
					hasNext: page * limit < total,
					hasPrev: page > 1,
				},
			},
		});
	} catch (error) {
		console.error("Get photos error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};
// Add photo compression endpoint for web viewing
export const getCompressedPhoto = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { quality = "80", width, height } = req.query;

		const photo = await prisma.photo.findUnique({
			where: { id },
		});

		if (!photo) {
			return res.status(404).json({
				success: false,
				error: "Photo not found",
			});
		}

		// Return compressed version URL or generate on-demand
		// This could be enhanced to generate different sizes
		res.json({
			success: true,
			data: {
				compressedUrl: photo.thumbnailUrl, // For now, return thumbnail
				originalUrl: photo.originalUrl,
			},
		});
	} catch (error) {
		console.error("Get compressed photo error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Download photo endpoint - returns the actual image data for download
export const downloadPhoto = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { galleryId } = req.query;

		console.log(`📥 Download request for photo ID: ${id} (method: ${req.method})`);

		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: {
								id: true,
								password: true,
								photographerId: true,
								expiresAt: true,
							},
						},
					},
				},
			},
		});

		if (!photo) {
			console.log(`❌ Photo not found: ${id}`);
			return res.status(404).json({
				success: false,
				error: "Photo not found",
			});
		}

		// Check if gallery has expired
		if (
			photo.folder.gallery.expiresAt &&
			photo.folder.gallery.expiresAt < new Date()
		) {
			console.log(`❌ Gallery expired for photo: ${id}`);
			return res.status(410).json({
				success: false,
				error: "Gallery has expired",
			});
		}

		// Check gallery access permissions
		if (photo.folder.gallery.password) {
			let isAuthorized = false;

			// 1) If user is authenticated, allow if photographer owner or client with access
			const authHeader = req.headers["authorization"];
			const bodyToken = req.body?.token as string | undefined;
			const queryToken = req.query.token as string | undefined;
			const token = bodyToken || queryToken || (authHeader && (authHeader as string).split(" ")[1]);
			if (token) {
				try {
					const jwt = await import("jsonwebtoken");
					const decoded = jwt.default.verify(
						token,
						process.env.JWT_SECRET!
					) as any;
					const userId = decoded.userId as string;

					// Photographer who owns the gallery
					if (
						decoded.role === "PHOTOGRAPHER" &&
						userId === photo.folder.gallery.photographerId
					) {
						isAuthorized = true;
					} else {
						// Client with explicit access
						const hasAccess = await prisma.galleryAccess.findUnique({
							where: {
								userId_galleryId: {
									userId,
									galleryId: photo.folder.gallery.id,
								},
							},
						});
						if (hasAccess) isAuthorized = true;
					}
				} catch {
					// ignore token errors; will fall back to password header
				}
			}

			// 2) If not authorized yet, validate provided password (via body, header, or query)
			if (!isAuthorized) {
				const providedPassword =
					(req.body?.password as string | undefined) ||
					(req.headers["x-gallery-password"] as string | undefined) ||
					(req.query.password as string | undefined);

				if (!providedPassword) {
					console.log(`❌ Password required for photo download: ${id}`);
					return res
						.status(401)
						.json({ success: false, error: "Password required" });
				}

				const isValidPassword = await (
					await import("bcryptjs")
				).default.compare(providedPassword, photo.folder.gallery.password);
				if (!isValidPassword) {
					console.log(`❌ Invalid password for photo download: ${id}`);
					return res
						.status(401)
						.json({ success: false, error: "Invalid password" });
				}
			}
		}

		console.log(`📸 Photo found: ${photo.filename}`);
		console.log(`🔗 Original URL: ${photo.originalUrl}`);

		// Extract the S3 bucket and key from the original URL
		const originalUrl = new URL(photo.originalUrl);
		console.log(`🔗 Parsed URL pathname: ${originalUrl.pathname}`);

		const pathParts = originalUrl.pathname
			.split("/")
			.filter((part) => part.length > 0);
		console.log(`📂 Path parts: ${JSON.stringify(pathParts)}`);

		const bucketName = pathParts[0]; // First part is bucket name
		const originalKey = decodeURIComponent(pathParts.slice(1).join("/")); // Rest is the key, decoded

		console.log(`🪣 Extracted bucket: "${bucketName}"`);
		console.log(`🔑 Extracted S3 key: "${originalKey}"`);

		// Stream the image directly from S3 to client (much faster!)
		const { getObjectStreamFromS3 } = await import("../utils/s3Storage");
		const { stream, contentLength } = await getObjectStreamFromS3(
			originalKey,
			bucketName
		);

		console.log(`🚀 Streaming from S3, size: ${contentLength} bytes`);

		// Set appropriate headers for download
		res.setHeader("Content-Type", "application/octet-stream");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${photo.filename}"`
		);
		res.setHeader("Content-Length", contentLength.toString());

		// Stream the image data directly from S3 to client (no server buffering!)
		stream.pipe(res);

		// Handle stream errors
		stream.on("error", (error: any) => {
			console.error("❌ Stream error:", error);
			if (!res.headersSent) {
				res.status(500).json({ success: false, error: `Download failed: ${error.message}` });
			}
		});

		stream.on("end", () => {
			console.log("✅ Stream completed successfully");
		});
	} catch (error) {
		console.error("❌ Download photo error for ID:", req.params.id);
		console.error("Error details:", error);
  if (error instanceof Error) {
    if(error.name === 'NoSuchKey') {
      return res.status(404).json({ success: false, error: "Photo not found in storage."});
    }
		return res.status(500).json({
			success: false,
			error: error.message,
		});
  }
		res.status(500).json({
			success: false,
			error: "An unknown error occurred during download.",
		});
	}
};

// Enhanced delete with better cleanup
export const deletePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const photographerId = req.user!.id;

		// Find photo and verify ownership
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { photographerId: true },
						},
					},
				},
			},
		});

		if (!photo || photo.folder.gallery.photographerId !== photographerId) {
			return res.status(404).json({
				success: false,
				error: "Photo not found or access denied",
			});
		}

		// Delete from S3 storage with better error handling
		try {
			const originalKey = new URL(photo.originalUrl).pathname
				.split("/")
				.slice(2)
				.join("/");
			const deletePromises = [
				deleteFromS3(originalKey).catch((err) =>
					console.warn("Failed to delete original:", err)
				),
			];

			// Only delete thumbnail if it exists (may be null for pending thumbnails)
			if (photo.thumbnailUrl) {
				const thumbnailKey = new URL(photo.thumbnailUrl).pathname
					.split("/")
					.slice(2)
					.join("/");
				deletePromises.push(
					deleteFromS3(thumbnailKey).catch((err) =>
						console.warn("Failed to delete thumbnail:", err)
					)
				);
			}

			await Promise.all(deletePromises);
		} catch (storageError) {
			console.error("Storage deletion error:", storageError);
			// Continue with database deletion
		}

		// Delete from database
		await prisma.photo.delete({ where: { id } });

		res.json({
			success: true,
			message: "Photo deleted successfully",
		});
	} catch (error) {
		console.error("Delete photo error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Add bulk operations for managing large numbers of photos
export const bulkDeletePhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { photoIds } = req.body;
		const photographerId = req.user!.id;

		if (!Array.isArray(photoIds) || photoIds.length === 0) {
			return res.status(400).json({
				success: false,
				error: "Photo IDs array is required",
			});
		}

		// Verify all photos belong to the photographer
		const photos = await prisma.photo.findMany({
			where: {
				id: { in: photoIds },
				folder: {
					gallery: { photographerId },
				},
			},
		});

		if (photos.length !== photoIds.length) {
			return res.status(403).json({
				success: false,
				error: "Some photos not found or access denied",
			});
		}

		// Delete from storage
		const deletePromises = photos.map(async (photo) => {
			try {
				const originalKey = new URL(photo.originalUrl).pathname
					.split("/")
					.slice(2)
					.join("/");
				const promises = [deleteFromS3(originalKey)];

				// Only delete thumbnail if it exists (may be null for pending thumbnails)
				if (photo.thumbnailUrl) {
					const thumbnailKey = new URL(photo.thumbnailUrl).pathname
						.split("/")
						.slice(2)
						.join("/");
					promises.push(deleteFromS3(thumbnailKey));
				}

				await Promise.all(promises);
			} catch (error) {
				console.warn(`Failed to delete storage for photo ${photo.id}:`, error);
			}
		});

		await Promise.all(deletePromises);

		// Delete from database
		const result = await prisma.photo.deleteMany({
			where: { id: { in: photoIds } },
		});

		res.json({
			success: true,
			message: `${result.count} photos deleted successfully`,
		});
	} catch (error) {
		console.error("Bulk delete photos error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Like a photo
export const likePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		// Ensure photo exists
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Sync likes across photographer and all clients with access to this gallery
		// 1) Find gallery photographer
		const galleryOwner = await prisma.gallery.findUnique({
			where: { id: photo.folder.galleryId },
			select: { photographerId: true },
		});

		// 2) Find all clients who have access to this gallery
		const accessUsers = await prisma.galleryAccess.findMany({
			where: { galleryId: photo.folder.galleryId },
			select: { userId: true },
		});

		// 3) Build the set of users to mirror the like to (owner + all clients with access)
		const userIdsToLike = new Set<string>([
			userId,
			...(galleryOwner ? [galleryOwner.photographerId] : []),
		]);
		accessUsers.forEach((u) => userIdsToLike.add(u.userId));

		// 4) Create likes for all these users, skipping duplicates
		await prisma.likedPhoto.createMany({
			data: Array.from(userIdsToLike).map((uid) => ({
				userId: uid,
				photoId: id,
			})),
			skipDuplicates: true,
		});

		return res.json({ success: true, message: "Photo liked (synced)" });
	} catch (error) {
		console.error("Like photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Unlike a photo
export const unlikePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		// Ensure photo exists to derive gallery
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Get gallery owner and all clients with access
		const galleryOwner = await prisma.gallery.findUnique({
			where: { id: photo.folder.galleryId },
			select: { photographerId: true },
		});
		const accessUsers = await prisma.galleryAccess.findMany({
			where: { galleryId: photo.folder.galleryId },
			select: { userId: true },
		});

		const userIdsToUnlike = new Set<string>([
			userId,
			...(galleryOwner ? [galleryOwner.photographerId] : []),
		]);
		accessUsers.forEach((u) => userIdsToUnlike.add(u.userId));

		await prisma.likedPhoto.deleteMany({
			where: { photoId: id, userId: { in: Array.from(userIdsToUnlike) } },
		});

		return res.json({ success: true, message: "Photo unliked (synced)" });
	} catch (error) {
		console.error("Unlike photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Favorite a photo
export const favoritePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Sync favorites across photographer and all clients with access
		const galleryOwner = await prisma.gallery.findUnique({
			where: { id: photo.folder.galleryId },
			select: { photographerId: true },
		});
		const accessUsers = await prisma.galleryAccess.findMany({
			where: { galleryId: photo.folder.galleryId },
			select: { userId: true },
		});

		const userIdsToFavorite = new Set<string>([
			userId,
			...(galleryOwner ? [galleryOwner.photographerId] : []),
		]);
		accessUsers.forEach((u) => userIdsToFavorite.add(u.userId));

		await prisma.favoritedPhoto.createMany({
			data: Array.from(userIdsToFavorite).map((uid) => ({
				userId: uid,
				photoId: id,
			})),
			skipDuplicates: true,
		});

		return res.json({ success: true, message: "Photo favorited (synced)" });
	} catch (error) {
		console.error("Favorite photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Unfavorite a photo
export const unfavoritePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		// Ensure photo exists to derive gallery
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Get gallery owner and all clients with access
		const galleryOwner = await prisma.gallery.findUnique({
			where: { id: photo.folder.galleryId },
			select: { photographerId: true },
		});
		const accessUsers = await prisma.galleryAccess.findMany({
			where: { galleryId: photo.folder.galleryId },
			select: { userId: true },
		});

		const userIdsToUnfavorite = new Set<string>([
			userId,
			...(galleryOwner ? [galleryOwner.photographerId] : []),
		]);
		accessUsers.forEach((u) => userIdsToUnfavorite.add(u.userId));

		await prisma.favoritedPhoto.deleteMany({
			where: { photoId: id, userId: { in: Array.from(userIdsToUnfavorite) } },
		});

		return res.json({ success: true, message: "Photo unfavorited (synced)" });
	} catch (error) {
		console.error("Unfavorite photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Get like/favorite status for the current user
export const getPhotoStatus = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		const [liked, favorited, posted] = await Promise.all([
			prisma.likedPhoto.findUnique({
				where: { userId_photoId: { userId, photoId: id } },
			}),
			prisma.favoritedPhoto.findUnique({
				where: { userId_photoId: { userId, photoId: id } },
			}),
			(prisma as any).postPhoto.findUnique({
				where: { userId_photoId: { userId, photoId: id } },
			}),
		]);

		return res.json({
			success: true,
			data: { liked: !!liked, favorited: !!favorited, posted: !!posted },
		});
	} catch (error) {
		console.error("Get photo status error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Get all liked photos for the current user
export const getLikedPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const liked = await prisma.likedPhoto.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			include: {
				photo: {
					include: {
						folder: {
							include: {
								gallery: {
									include: { photographer: { select: { name: true } } },
								},
							},
						},
					},
				},
			},
		});

		const photos = liked.map((lp) => lp.photo);
		return res.json({ success: true, data: photos });
	} catch (error) {
		console.error("Get liked photos error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Get all favorited photos for the current user
export const getFavoritedPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const favorites = await prisma.favoritedPhoto.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			include: {
				photo: {
					include: {
						folder: {
							include: {
								gallery: {
									include: { photographer: { select: { name: true } } },
								},
							},
						},
					},
				},
			},
		});

		const photos = favorites.map((fp) => fp.photo);
		return res.json({ success: true, data: photos });
	} catch (error) {
		console.error("Get favorited photos error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Mark a photo for posting (photographer only)
export const postPhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		// Ensure photo exists and belongs to the photographer
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Ensure the user is the photographer of this gallery
		if (photo.folder.gallery.photographerId !== userId) {
			return res.status(403).json({
				success: false,
				error: "Only the photographer can mark photos for posting",
			});
		}

		// Check if already marked for posting
		const existingPost = await (prisma as any).postPhoto.findUnique({
			where: { userId_photoId: { userId, photoId: id } },
		});

		if (existingPost) {
			return res.json({
				success: true,
				message: "Photo already marked for posting",
			});
		}

		// Create the post record
		await (prisma as any).postPhoto.create({
			data: { userId, photoId: id },
		});

		return res.json({ success: true, message: "Photo marked for posting" });
	} catch (error) {
		console.error("Post photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Unmark a photo for posting (photographer only)
export const unpostPhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user!.id;

		// Ensure photo exists and belongs to the photographer
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				folder: {
					include: {
						gallery: {
							select: { id: true, photographerId: true },
						},
					},
				},
			},
		});
		if (!photo) {
			return res.status(404).json({ success: false, error: "Photo not found" });
		}

		// Ensure the user is the photographer of this gallery
		if (photo.folder.gallery.photographerId !== userId) {
			return res.status(403).json({
				success: false,
				error: "Only the photographer can unmark photos for posting",
			});
		}

		// Delete the post record
		await (prisma as any).postPhoto.deleteMany({
			where: { userId, photoId: id },
		});

		return res.json({ success: true, message: "Photo unmarked for posting" });
	} catch (error) {
		console.error("Unpost photo error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Get all photos marked for posting for the current photographer
export const getPosts = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const posts = await (prisma as any).postPhoto.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			include: {
				photo: {
					include: {
						folder: {
							include: {
								gallery: {
									include: { photographer: { select: { name: true } } },
								},
							},
						},
					},
				},
			},
		});

		const photos = posts.map((pp: any) => pp.photo);
		return res.json({ success: true, data: photos });
	} catch (error) {
		console.error("Get posts error:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
};

// Download liked photos as zip
export const downloadLikedPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params;
		const userId = req.user!.id;
		const providedPassword =
			(req.headers["x-gallery-password"] as string | undefined) ||
			(req.query.password as string | undefined);

		// Verify gallery access
		const hasAccess = await DownloadService.verifyGalleryAccess(
			galleryId,
			userId,
			req.user!.role,
			providedPassword
		);

		if (!hasAccess) {
			return res.status(401).json({
				success: false,
				error: "Access denied or password required",
			});
		}

		// Use download service to create and stream the zip
		await DownloadService.createFilteredPhotoZip(
			galleryId,
			userId,
			"liked",
			res
		);
	} catch (error) {
		console.error("Download liked photos error:", error);
		if (!res.headersSent) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			});
		}
	}
};

export const createDownloadTicket = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId, folderId, filter } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ success: false, error: "User not authenticated" });
		}

		// Verify gallery access
		const hasAccess = await DownloadService.verifyGalleryAccess(
			galleryId,
			userId,
			req.user?.role || "CLIENT",
			req.headers["x-gallery-password"] as string
		);

		if (!hasAccess) {
			return res.status(401).json({ success: false, error: "Access denied or password required" });
		}

		const ticketPayload = {
			userId,
			galleryId,
			folderId,
			filter,
			timestamp: Date.now(),
		};

		const ticket = jwt.sign(ticketPayload, process.env.JWT_SECRET!, { expiresIn: '5m' }); // Ticket is valid for 5 minutes

		const protocol = req.headers['x-forwarded-proto'] || req.protocol;
		const baseUrl = process.env.DIRECT_DOWNLOAD_URL || `${protocol}://${req.get('host')}`;
		const downloadUrl = `${baseUrl}/api/photos/download-zip?ticket=${ticket}`;

		res.json({ success: true, downloadUrl });

	} catch (error) {
		console.error("Create download ticket error:", error);
		res.status(500).json({ success: false, error: "Failed to create download ticket" });
	}
};

export const downloadWithTicket = async (req: Request, res: Response) => {
	try {
		const { ticket } = req.query;

		if (!ticket) {
			return res.status(400).json({ success: false, error: "Missing download ticket" });
		}

		const decoded = jwt.verify(ticket as string, process.env.JWT_SECRET!) as any;

		const { userId, galleryId, folderId, filter } = decoded;

		switch (filter) {
			case 'all':
				await DownloadService.createGalleryPhotoZip(galleryId, userId, "all", undefined, res);
				break;
			case 'folder':
				await DownloadService.createGalleryPhotoZip(galleryId, userId, "folder", folderId, res);
				break;
			case 'liked':
			case 'favorited':
				await DownloadService.createFilteredPhotoZip(galleryId, userId, filter, res);
				break;
			default:
				return res.status(400).json({ success: false, error: "Invalid download filter" });
		}
	} catch (error) {
		console.error("Download with ticket error:", error);
		if (error instanceof jwt.JsonWebTokenError) {
			return res.status(401).json({ success: false, error: "Invalid or expired download ticket" });
		}
		res.status(500).json({ success: false, error: "Failed to process download" });
	}
};

// Download favorited photos as zip
export const downloadFavoritedPhotos = async (
	req: AuthRequest,
	res: Response
) => {
	try {
		const { galleryId } = req.params;
		const userId = req.user!.id;
		const providedPassword =
			(req.headers["x-gallery-password"] as string | undefined) ||
			(req.query.password as string | undefined);

		// Verify gallery access
		const hasAccess = await DownloadService.verifyGalleryAccess(
			galleryId,
			userId,
			req.user!.role,
			providedPassword
		);

		if (!hasAccess) {
			return res.status(401).json({
				success: false,
				error: "Access denied or password required",
			});
		}

		// Use download service to create and stream the zip
		await DownloadService.createFilteredPhotoZip(
			galleryId,
			userId,
			"favorited",
			res
		);
	} catch (error) {
		console.error("Download favorited photos error:", error);
		if (!res.headersSent) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			});
		}
	}
};

// Get download progress
export const getDownloadProgress = async (req: AuthRequest, res: Response) => {
	try {
		const { downloadId } = req.params;

		const progress = DownloadService.getProgress(downloadId);

		if (!progress) {
			return res.status(404).json({
				success: false,
				error: "Download not found or expired",
			});
		}

		res.json({
			success: true,
			data: progress,
		});
	} catch (error) {
		console.error("Get download progress error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

// Download all photos from gallery as zip
export const downloadAllPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "User not authenticated",
			});
		}

		console.log(
			`📦 Starting all photos download for gallery ${galleryId} by user ${userId}`
		);

		// Set timeout to 30 minutes for large downloads
		req.setTimeout(30 * 60 * 1000); // 30 minutes
		res.setTimeout(30 * 60 * 1000); // 30 minutes

		// Verify gallery access
		const hasAccess = await DownloadService.verifyGalleryAccess(
			galleryId,
			userId,
			req.user?.role || "CLIENT",
			req.headers["x-gallery-password"] as string
		);

		if (!hasAccess) {
			return res.status(401).json({
				success: false,
				error: "Access denied or password required",
			});
		}

		// Set headers for streaming download before starting
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("Transfer-Encoding", "chunked");

		// Use download service to create and stream the zip
		await DownloadService.createGalleryPhotoZip(
			galleryId,
			userId,
			"all",
			undefined,
			res
		);
	} catch (error) {
		console.error("Download all photos error:", error);

		if (!res.headersSent) {
			res.status(500).json({
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to download all photos",
			});
		} else {
			// If headers are already sent, we can't send JSON, so just end the response
			res.end();
		}
	}
};

// Download folder photos as zip
export const downloadFolderPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId, folderId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "User not authenticated",
			});
		}

		console.log(
			`📦 Starting folder photos download for gallery ${galleryId}, folder ${folderId} by user ${userId}`
		);

		// Set timeout to 30 minutes for large downloads
		req.setTimeout(30 * 60 * 1000); // 30 minutes
		res.setTimeout(30 * 60 * 1000); // 30 minutes

		// Verify gallery access
		const hasAccess = await DownloadService.verifyGalleryAccess(
			galleryId,
			userId,
			req.user?.role || "CLIENT",
			req.headers["x-gallery-password"] as string
		);

		if (!hasAccess) {
			return res.status(401).json({
				success: false,
				error: "Access denied or password required",
			});
		}

		// Set headers for streaming download before starting
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("Transfer-Encoding", "chunked");

		// Use download service to create and stream the zip
		await DownloadService.createGalleryPhotoZip(
			galleryId,
			userId,
			"folder",
			folderId,
			res
		);
	} catch (error) {
		console.error("Download folder photos error:", error);

		if (!res.headersSent) {
			res.status(500).json({
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to download folder photos",
			});
		} else {
			// If headers are already sent, we can't send JSON, so just end the response
			res.end();
		}
	}
};
