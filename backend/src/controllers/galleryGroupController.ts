import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Extend Request to include user from auth middleware
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Validation schemas
const createGroupSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    description: z.string().optional(),
    shootDate: z.string().datetime().optional().nullable(),
    coverPhotoId: z.string().optional().nullable(),
});

const updateGroupSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    coverPhotoId: z.string().optional().nullable(),
    shootDate: z.string().datetime().optional().nullable(),
});

const assignGalleriesSchema = z.object({
    galleryIds: z.array(z.string()),
});

// Helper function to compute year/month from date
function extractYearMonth(date: Date | null) {
    if (!date) return { shootYear: null, shootMonth: null };
    return {
        shootYear: date.getFullYear(),
        shootMonth: date.getMonth() + 1, // JavaScript months are 0-indexed
    };
}

export const galleryGroupController = {
    // Create a new gallery group
    async createGroup(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const data = createGroupSchema.parse(req.body);

            const shootDate = data.shootDate ? new Date(data.shootDate) : null;
            const { shootYear, shootMonth } = extractYearMonth(shootDate);

            const group = await prisma.galleryGroup.create({
                data: {
                    name: data.name,
                    description: data.description,
                    coverPhotoId: data.coverPhotoId,
                    shootDate,
                    shootYear,
                    shootMonth,
                    photographerId,
                },
                include: {
                    coverPhoto: {
                        select: {
                            id: true,
                            thumbnailUrl: true,
                            mediumUrl: true,
                            largeUrl: true,
                            originalUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            galleries: true,
                        },
                    },
                },
            });

            res.status(201).json(group);
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating gallery group:', error);
            res.status(500).json({ error: 'Failed to create gallery group' });
        }
    },

    // Get all groups for the photographer
    async getGroups(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const groups = await prisma.galleryGroup.findMany({
                where: { photographerId },
                include: {
                    coverPhoto: {
                        select: {
                            id: true,
                            thumbnailUrl: true,
                            mediumUrl: true,
                            largeUrl: true,
                            originalUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            galleries: true,
                        },
                    },
                },
                orderBy: [
                    { shootYear: 'desc' },
                    { shootMonth: 'desc' },
                    { createdAt: 'desc' },
                ],
            });

            res.json(groups);
        } catch (error: unknown) {
            console.error('Error fetching gallery groups:', error);
            res.status(500).json({ error: 'Failed to fetch gallery groups' });
        }
    },

    // Get a single group with its galleries
    async getGroupById(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            const { id } = req.params;

            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const group = await prisma.galleryGroup.findFirst({
                where: {
                    id,
                    photographerId,
                },
                include: {
                    coverPhoto: {
                        select: {
                            id: true,
                            thumbnailUrl: true,
                            mediumUrl: true,
                            largeUrl: true,
                            originalUrl: true,
                        },
                    },
                    galleries: {
                        include: {
                            folders: {
                                include: {
                                    coverPhoto: {
                                        select: {
                                            id: true,
                                            thumbnailUrl: true,
                                            mediumUrl: true,
                                            largeUrl: true,
                                            originalUrl: true,
                                        },
                                    },
                                    _count: {
                                        select: {
                                            photos: true,
                                        },
                                    },
                                },
                            },
                            _count: {
                                select: {
                                    likedBy: true,
                                    favoritedBy: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                    _count: {
                        select: {
                            galleries: true,
                        },
                    },
                },
            });

            if (!group) {
                return res.status(404).json({ error: 'Gallery group not found' });
            }

            // Calculate total size for the group
            const totalSize = group.galleries.reduce((sum: number, gallery: any) => {
                const gallerySize = gallery.folders.reduce((folderSum: number, folder: any) => {
                    return folderSum + (folder._count?.photos ?? 0);
                }, 0);
                return sum + gallerySize;
            }, 0);

            res.json({ ...group, totalSize });
        } catch (error: unknown) {
            console.error('Error fetching gallery group:', error);
            res.status(500).json({ error: 'Failed to fetch gallery group' });
        }
    },

    // Update a gallery group
    async updateGroup(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            const { id } = req.params;

            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const data = updateGroupSchema.parse(req.body);

            // Verify ownership
            const existingGroup = await prisma.galleryGroup.findFirst({
                where: { id, photographerId },
            });

            if (!existingGroup) {
                return res.status(404).json({ error: 'Gallery group not found' });
            }

            // Calculate new year/month if date is being updated
            let shootYear = existingGroup.shootYear;
            let shootMonth = existingGroup.shootMonth;
            let shootDate = existingGroup.shootDate;

            if ('shootDate' in data) {
                shootDate = data.shootDate ? new Date(data.shootDate) : null;
                const extracted = extractYearMonth(shootDate);
                shootYear = extracted.shootYear;
                shootMonth = extracted.shootMonth;
            }

            const updatedGroup = await prisma.galleryGroup.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.coverPhotoId !== undefined && { coverPhotoId: data.coverPhotoId }),
                    ...('shootDate' in data && { shootDate, shootYear, shootMonth }),
                },
                include: {
                    coverPhoto: {
                        select: {
                            id: true,
                            thumbnailUrl: true,
                            mediumUrl: true,
                            largeUrl: true,
                            originalUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            galleries: true,
                        },
                    },
                },
            });

            res.json(updatedGroup);
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating gallery group:', error);
            res.status(500).json({ error: 'Failed to update gallery group' });
        }
    },

    // Delete a gallery group (galleries become ungrouped)
    async deleteGroup(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            const { id } = req.params;

            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verify ownership
            const existingGroup = await prisma.galleryGroup.findFirst({
                where: { id, photographerId },
            });

            if (!existingGroup) {
                return res.status(404).json({ error: 'Gallery group not found' });
            }

            // Delete the group (galleries will be set to null due to onDelete: SetNull)
            await prisma.galleryGroup.delete({
                where: { id },
            });

            res.json({ message: 'Gallery group deleted successfully' });
        } catch (error: unknown) {
            console.error('Error deleting gallery group:', error);
            res.status(500).json({ error: 'Failed to delete gallery group' });
        }
    },

    // Assign galleries to a group
    async assignGalleries(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            const { id } = req.params;

            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { galleryIds } = assignGalleriesSchema.parse(req.body);

            // Verify group ownership
            const group = await prisma.galleryGroup.findFirst({
                where: { id, photographerId },
            });

            if (!group) {
                return res.status(404).json({ error: 'Gallery group not found' });
            }

            // Verify all galleries belong to the photographer
            const galleries = await prisma.gallery.findMany({
                where: {
                    id: { in: galleryIds },
                    photographerId,
                },
            });

            if (galleries.length !== galleryIds.length) {
                return res.status(403).json({ error: 'Some galleries not found or unauthorized' });
            }

            // Update galleries to belong to this group
            await prisma.gallery.updateMany({
                where: {
                    id: { in: galleryIds },
                    photographerId,
                },
                data: {
                    groupId: id,
                },
            });

            res.json({ message: `${galleryIds.length} galleries assigned to group` });
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error assigning galleries to group:', error);
            res.status(500).json({ error: 'Failed to assign galleries to group' });
        }
    },

    // Remove galleries from a group
    async removeGalleries(req: AuthRequest, res: Response) {
        try {
            const photographerId = req.user?.id;
            const { id } = req.params;

            if (!photographerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { galleryIds } = assignGalleriesSchema.parse(req.body);

            // Verify group ownership
            const group = await prisma.galleryGroup.findFirst({
                where: { id, photographerId },
            });

            if (!group) {
                return res.status(404).json({ error: 'Gallery group not found' });
            }

            // Remove galleries from this group
            await prisma.gallery.updateMany({
                where: {
                    id: { in: galleryIds },
                    photographerId,
                    groupId: id,
                },
                data: {
                    groupId: null,
                },
            });

            res.json({ message: `Galleries removed from group` });
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error removing galleries from group:', error);
            res.status(500).json({ error: 'Failed to remove galleries from group' });
        }
    },
};
