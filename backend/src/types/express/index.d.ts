import { User } from '@prisma/client'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User | any
    }
  }
}