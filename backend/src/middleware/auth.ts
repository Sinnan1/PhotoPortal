import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

export const authenticateToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const authHeader = req.headers['authorization']
		const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

		if (!token) {
			return res.status(401).json({
				success: false,
				error: 'Access token required'
			})
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
		
		// Get user from database to ensure they still exist
		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
			select: { id: true, email: true, role: true }
		})

		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'User not found'
			})
		}

		req.user = user
		next()
	} catch (error) {
		return res.status(403).json({
			success: false,
			error: 'Invalid or expired token'
		})
	}
}

export const requireRole = (role: string) => {
	return (req: AuthRequest, res: Response, next: NextFunction) => {
		if (req.user?.role !== role) {
			return res.status(403).json({
				success: false,
				error: 'Insufficient permissions'
			})
		}
		next()
	}
}