import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Submit feedback (authenticated clients only)
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user!.id;
    const {
      overallRating,
      selectionProcessRating,
      portalExperienceRating,
      comments,
      wouldRecommend
    } = req.body;

    // Validate ratings
    if (!overallRating || !selectionProcessRating || !portalExperienceRating) {
      return res.status(400).json({
        success: false,
        error: 'All ratings are required'
      });
    }

    if (
      overallRating < 1 || overallRating > 5 ||
      selectionProcessRating < 1 || selectionProcessRating > 5 ||
      portalExperienceRating < 1 || portalExperienceRating > 5
    ) {
      return res.status(400).json({
        success: false,
        error: 'Ratings must be between 1 and 5'
      });
    }

    // Get client and their photographer
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { photographerId: true }
    });

    if (!client || !client.photographerId) {
      return res.status(400).json({
        success: false,
        error: 'Client must be associated with a photographer'
      });
    }

    // Create or update feedback (upsert to allow updating)
    const feedback = await prisma.clientFeedback.upsert({
      where: {
        clientId_photographerId: {
          clientId,
          photographerId: client.photographerId
        }
      },
      create: {
        clientId,
        photographerId: client.photographerId,
        overallRating,
        selectionProcessRating,
        portalExperienceRating,
        comments,
        wouldRecommend: wouldRecommend ?? true
      },
      update: {
        overallRating,
        selectionProcessRating,
        portalExperienceRating,
        comments,
        wouldRecommend: wouldRecommend ?? true
      }
    });

    // Mark feedback request as completed
    await prisma.user.update({
      where: { id: clientId },
      data: { feedbackRequestActive: false }
    });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Request feedback from a client (photographer only)
export const requestFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const photographerId = req.user!.id;

    // Verify the client belongs to this photographer
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        photographerId,
        role: 'CLIENT'
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or access denied'
      });
    }

    // Update client to request feedback
    await prisma.user.update({
      where: { id: clientId },
      data: {
        feedbackRequestedAt: new Date(),
        feedbackRequestActive: true
      }
    });

    res.json({
      success: true,
      message: 'Feedback request sent to client'
    });
  } catch (error) {
    console.error('Request feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get all feedback for photographer
export const getFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const photographerId = req.user!.id;

    // Get all feedback for this photographer
    const feedback = await prisma.clientFeedback.findMany({
      where: { photographerId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Check if feedback is requested for current client
export const checkFeedbackStatus = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user!.id;

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        feedbackRequestActive: true,
        feedbackRequestedAt: true
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: {
        feedbackRequested: client.feedbackRequestActive,
        requestedAt: client.feedbackRequestedAt
      }
    });
  } catch (error) {
    console.error('Check feedback status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
