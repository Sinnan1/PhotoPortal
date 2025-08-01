import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const register = async (req: Request, res: Response) => {
	try {
		const { email, password, name, role = 'CLIENT' } = req.body

		// Validate input
		if (!email || !password || !name) {
			return res.status(400).json({
				success: false,
				error: 'Email, password, and name are required'
			})
		}

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email }
		})

		if (existingUser) {
			return res.status(400).json({
				success: false,
				error: 'User with this email already exists'
			})
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12)

		// Create user
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role: role.toUpperCase()
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		})

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SECRET!,
			{ expiresIn: '7d' }
		)

		res.status(201).json({
			success: true,
			data: {
				user,
				token
			}
		})
	} catch (error) {
		console.error('Registration error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body

		// Validate input
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				error: 'Email and password are required'
			})
		}

		// Find user
		const user = await prisma.user.findUnique({
			where: { email }
		})

		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Invalid credentials'
			})
		}

		// Check password
		const isValidPassword = await bcrypt.compare(password, user.password)

		if (!isValidPassword) {
			return res.status(401).json({
				success: false,
				error: 'Invalid credentials'
			})
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SECRET!,
			{ expiresIn: '7d' }
		)

		res.json({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role
				},
				token
			}
		})
	} catch (error) {
		console.error('Login error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}