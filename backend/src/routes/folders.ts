import express from 'express'
import { authenticateToken } from '../middleware/auth'
import {
	createFolder,
	getFolderTree,
	getFolder,
	updateFolder,
	deleteFolder,
	setFolderCover,
	moveFolder
} from '../controllers/folderController'

const router = express.Router()

// All folder routes require authentication
router.use(authenticateToken)

// Gallery-specific folder routes
router.post('/galleries/:galleryId/folders', createFolder)
router.get('/galleries/:galleryId/folders/tree', getFolderTree)

// Individual folder routes
router.get('/:folderId', getFolder)
router.put('/:folderId', updateFolder)
router.delete('/:folderId', deleteFolder)

// Folder-specific operations
router.post('/:folderId/set-cover', setFolderCover)
router.post('/:folderId/move', moveFolder)

export default router

