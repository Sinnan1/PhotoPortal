import { Router } from 'express';
import {
  submitFeedback,
  requestFeedback,
  getFeedback,
  checkFeedbackStatus
} from '../controllers/feedbackController';
import { authenticateToken, requireAnyRole } from '../middleware/auth';

const router = Router();

// Submit feedback (authenticated clients)
router.post('/feedback', authenticateToken, submitFeedback);

// Request feedback from a client (photographers)
router.post('/clients/:clientId/request-feedback', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), requestFeedback);

// Get all feedback (photographers)
router.get('/feedback', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), getFeedback);

// Check if feedback is requested for current client
router.get('/feedback/status', authenticateToken, checkFeedbackStatus);

export default router;
