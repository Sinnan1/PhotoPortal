import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Import routes
import authRoutes from './routes/auth'
import galleryRoutes from './routes/galleries'
import photoRoutes from './routes/photos'
import photographersRoutes from './routes/photographers'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const prisma = new PrismaClient()

// Middleware
app.use(helmet())

// Restrictive CORS: allow only configured origins (comma-separated)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/galleries', galleryRoutes)
app.use('/api/photos', photoRoutes)
app.use('/api/photographers', photographersRoutes)

// Basic route
app.get('/', (req, res) => {
	res.json({ message: 'Photo Gallery API is running!' })
})

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Test database connection
app.get('/test-db', async (req, res) => {
	try {
		const userCount = await prisma.user.count()
		res.json({
			message: 'Database connected!',
			userCount,
			timestamp: new Date().toISOString()
		})
	} catch (error) {
		res.status(500).json({
			error: 'Database connection failed',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
})


app.listen(PORT, () => {
	console.log(`🚀 Server running on port ${PORT}`)
	console.log(`📍 Environment: ${process.env.NODE_ENV}`)
})