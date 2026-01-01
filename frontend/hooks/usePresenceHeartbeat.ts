'use client'

import { useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_INTERVAL = 60000 // 60 seconds
const BACKOFF_DELAYS = [2000, 4000, 8000] // Retry delays

/**
 * Hook to send presence heartbeat while viewing a gallery
 * Uses Page Visibility API to pause when tab is hidden
 * @param galleryId - The gallery being viewed (null for dashboard)
 * @param enabled - Whether to enable tracking (use to disable for non-photographers)
 */
export function usePresenceHeartbeat(galleryId: string | null, enabled: boolean = true) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const attemptRef = useRef(0)
    const isVisibleRef = useRef(true)
    const isPausedRef = useRef(false)

    const sendHeartbeat = useCallback(async () => {
        if (isPausedRef.current || !galleryId) return

        try {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('auth-token='))
                ?.split('=')[1]

            if (!token) return

            const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

            const response = await fetch(`${BASE_URL}/presence/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ galleryId })
            })

            if (response.ok) {
                // Reset backoff on success
                attemptRef.current = 0
            } else if (response.status === 429) {
                // Rate limited - this is expected, just continue
                console.debug('Presence heartbeat rate limited')
            } else {
                throw new Error(`Heartbeat failed: ${response.status}`)
            }
        } catch (error) {
            console.error('Presence heartbeat error:', error)

            // Exponential backoff
            if (attemptRef.current < BACKOFF_DELAYS.length - 1) {
                attemptRef.current++
            }

            // Schedule retry
            const delay = BACKOFF_DELAYS[attemptRef.current]
            setTimeout(sendHeartbeat, delay)
        }
    }, [galleryId])

    const startHeartbeat = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        // Send immediately
        sendHeartbeat()

        // Then start interval
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    }, [sendHeartbeat])

    const stopHeartbeat = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    const handleVisibilityChange = useCallback(() => {
        const isVisible = !document.hidden
        isVisibleRef.current = isVisible

        if (isVisible && !isPausedRef.current && galleryId) {
            // Tab became visible - resume heartbeat
            startHeartbeat()
        } else if (!isVisible) {
            // Tab became hidden - pause heartbeat
            stopHeartbeat()
        }
    }, [galleryId, startHeartbeat, stopHeartbeat])

    useEffect(() => {
        // Early return if tracking is disabled (e.g., for non-photographers)
        if (!enabled) return
        if (!galleryId) return

        // Start heartbeat
        startHeartbeat()

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            stopHeartbeat()
            document.removeEventListener('visibilitychange', handleVisibilityChange)

            // Clear presence on unmount
            const clearPresence = async () => {
                try {
                    const token = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('auth-token='))
                        ?.split('=')[1]

                    if (!token) return

                    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

                    await fetch(`${BASE_URL}/presence`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                } catch (error) {
                    // Ignore errors on cleanup
                }
            }

            clearPresence()
        }
    }, [enabled, galleryId, startHeartbeat, stopHeartbeat, handleVisibilityChange])

    return {
        pause: () => {
            isPausedRef.current = true
            stopHeartbeat()
        },
        resume: () => {
            isPausedRef.current = false
            if (enabled && isVisibleRef.current && galleryId) {
                startHeartbeat()
            }
        }
    }
}
