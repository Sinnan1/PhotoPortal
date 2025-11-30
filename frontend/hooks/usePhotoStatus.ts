import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { Photo } from "@/types"

interface UsePhotoStatusProps {
    photos: Photo[]
    onStatusUpdate: (photoId: string, status: { liked: boolean; favorited: boolean }) => void
}

export function usePhotoStatus({ photos, onStatusUpdate }: UsePhotoStatusProps) {
    const { user } = useAuth()
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        if (user && photos.length > 0) {
            checkPhotoStatuses()
        }
    }, [user, photos])

    const checkPhotoStatuses = async () => {
        if (!user) return

        setChecking(true)

        try {
            // Check status for each photo
            const statusPromises = photos.map(async (photo) => {
                try {
                    const response = await api.getPhotoStatus(photo.id)
                    return {
                        photoId: photo.id,
                        liked: response.data.liked,
                        favorited: response.data.favorited,
                    }
                } catch (error) {
                    console.error(`Failed to check status for photo ${photo.id}:`, error)
                    // Return current status from photo data as fallback
                    return {
                        photoId: photo.id,
                        liked: (photo.likedBy ?? []).some((like) => like.userId === user.id),
                        favorited: (photo.favoritedBy ?? []).some((favorite) => favorite.userId === user.id),
                    }
                }
            })

            const statuses = await Promise.all(statusPromises)

            // Update each photo's status
            statuses.forEach((status) => {
                onStatusUpdate(status.photoId, {
                    liked: status.liked,
                    favorited: status.favorited,
                })
            })
        } catch (error) {
            console.error("Failed to check photo statuses:", error)
        } finally {
            setChecking(false)
        }
    }

    return {
        checking,
        checkPhotoStatuses
    }
}
