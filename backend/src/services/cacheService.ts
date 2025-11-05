/**
 * In-Memory Cache Service
 * Provides caching for frequently accessed data to reduce database load
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class CacheService {
  private cache: Map<string, CacheEntry<any>>
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default

  constructor() {
    this.cache = new Map()
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpired()
    }, 60 * 1000)
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { data, expiresAt })
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.cache.size,
      active,
      expired
    }
  }

  /**
   * Get system configuration with caching
   */
  async getSystemConfig(configKey: string, ttl?: number): Promise<any> {
    const cacheKey = `config:${configKey}`
    
    // Try cache first
    const cached = this.get(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Fetch from database
    const config = await prisma.systemConfig.findUnique({
      where: { configKey }
    })

    const value = config?.configValue ?? null

    // Cache the result (even if null to avoid repeated DB queries)
    this.set(cacheKey, value, ttl || 10 * 60 * 1000) // 10 minutes for configs

    return value
  }

  /**
   * Invalidate system config cache
   */
  invalidateSystemConfig(configKey?: string): void {
    if (configKey) {
      this.delete(`config:${configKey}`)
    } else {
      // Invalidate all configs
      this.deletePattern('^config:')
    }
  }

  /**
   * Get user with caching (for authentication)
   */
  async getUserById(userId: string, ttl?: number): Promise<any> {
    const cacheKey = `user:${userId}`
    
    const cached = this.get(cacheKey)
    if (cached !== null) {
      return cached
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspendedAt: true,
        suspensionReason: true
      }
    })

    if (user) {
      this.set(cacheKey, user, ttl || 2 * 60 * 1000) // 2 minutes for user data
    }

    return user
  }

  /**
   * Invalidate user cache
   */
  invalidateUser(userId: string): void {
    this.delete(`user:${userId}`)
  }

  /**
   * Get gallery access list with caching
   */
  async getGalleryAccess(galleryId: string, ttl?: number): Promise<string[]> {
    const cacheKey = `gallery:access:${galleryId}`
    
    const cached = this.get<string[]>(cacheKey)
    if (cached !== null) {
      return cached
    }

    const accessList = await prisma.galleryAccess.findMany({
      where: { galleryId },
      select: { userId: true }
    })

    const userIds = accessList.map(a => a.userId)
    this.set(cacheKey, userIds, ttl || 5 * 60 * 1000) // 5 minutes

    return userIds
  }

  /**
   * Invalidate gallery access cache
   */
  invalidateGalleryAccess(galleryId: string): void {
    this.delete(`gallery:access:${galleryId}`)
  }

  /**
   * Get storage statistics with caching
   */
  async getStorageStats(ttl?: number): Promise<any> {
    const cacheKey = 'stats:storage'
    
    const cached = this.get(cacheKey)
    if (cached !== null) {
      return cached
    }

    const stats = await prisma.$queryRaw<Array<{ total_storage: bigint }>>`
      SELECT COALESCE(SUM("fileSize"), 0) as total_storage
      FROM "Photo"
    `

    const totalStorage = Number(stats[0]?.total_storage || 0)
    
    // Also get storage limit
    const storageLimit = await this.getSystemConfig('storage_limit')

    const result = {
      totalStorage,
      storageLimit: storageLimit ? Number(storageLimit) : 100 * 1024 * 1024 * 1024, // 100GB default
      timestamp: Date.now()
    }

    this.set(cacheKey, result, ttl || 5 * 60 * 1000) // 5 minutes for storage stats

    return result
  }

  /**
   * Invalidate storage stats cache
   */
  invalidateStorageStats(): void {
    this.delete('stats:storage')
  }
}

// Export singleton instance
export const cacheService = new CacheService()

// Export class for testing
export { CacheService }
