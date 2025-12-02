import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { galleryGroupController } from '../controllers/galleryGroupController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Gallery group routes
router.post('/', galleryGroupController.createGroup);
router.get('/', galleryGroupController.getGroups);
router.get('/:id', galleryGroupController.getGroupById);
router.patch('/:id', galleryGroupController.updateGroup);
router.delete('/:id', galleryGroupController.deleteGroup);

// Gallery assignment routes
router.post('/:id/galleries', galleryGroupController.assignGalleries);
router.delete('/:id/galleries', galleryGroupController.removeGalleries);

export default router;
