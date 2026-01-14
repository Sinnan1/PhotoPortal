import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { useLikePhoto, useUnlikePhoto, useFavoritePhoto, useUnfavoritePhoto, usePostPhoto, useUnpostPhoto } from "@/hooks/queries/usePhotos"
import type { Photo } from "@/types"

interface UsePhotoActionsProps {
    photos: Photo[] // Pass photos to check current status
    onPhotoStatusChange?: (photoId: string, status: { liked?: boolean; favorited?: boolean; posted?: boolean }) => void
    onDelete?: (photoId: string) => void
}

export function usePhotoActions({ photos, onPhotoStatusChange, onDelete }: UsePhotoActionsProps) {
    const { user } = useAuth()
    const { showToast } = useToast()

    const likePhotoMutation = useLikePhoto();
    const unlikePhotoMutation = useUnlikePhoto();
    const favoritePhotoMutation = useFavoritePhoto();
    const unfavoritePhotoMutation = useUnfavoritePhoto();
    const postPhotoMutation = usePostPhoto();
    const unpostPhotoMutation = useUnpostPhoto();

    const handleLikePhoto = async (photoId: string) => {
        const photo = photos.find((p) => p.id === photoId)
        if (!photo) return

        if (!user?.id) {
            showToast("Please log in to like photos", "error")
            return
        }

        const isLiked = (photo.likedBy ?? []).some((like) => like.userId === user.id)

        try {
            if (isLiked) {
                await unlikePhotoMutation.mutateAsync(photoId);
            } else {
                await likePhotoMutation.mutateAsync(photoId);
            }
            onPhotoStatusChange?.(photoId, { liked: !isLiked })
        } catch (error) {
            console.error('Like photo error:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage.toLowerCase().includes('limit reached')) {
                showToast("Like limit reached. Please unlike some photos to continue.", "error")
            } else {
                showToast("Failed to update like status", "error")
            }
        }
    }

    const handleFavoritePhoto = async (photoId: string) => {
        const photo = photos.find((p) => p.id === photoId)
        if (!photo) return

        if (!user?.id) {
            showToast("Please log in to favorite photos", "error")
            return
        }

        const isFavorited = (photo.favoritedBy ?? []).some((favorite) => favorite.userId === user.id)

        try {
            if (isFavorited) {
                await unfavoritePhotoMutation.mutateAsync(photoId);
            } else {
                await favoritePhotoMutation.mutateAsync(photoId);
            }
            onPhotoStatusChange?.(photoId, { favorited: !isFavorited })
        } catch (error) {
            console.error('Favorite photo error:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage.toLowerCase().includes('limit reached')) {
                showToast("Favorite limit reached. Please remove some favorites to continue.", "error")
            } else {
                showToast("Failed to update favorite status", "error")
            }
        }
    }

    const handlePostPhoto = async (photoId: string) => {
        const photo = photos.find((p) => p.id === photoId)
        if (!photo) return

        if (!user?.id) {
            showToast("Please log in to mark photos for posting", "error")
            return
        }

        const isPosted = (photo.postBy ?? []).some((post) => post.userId === user.id)

        try {
            if (isPosted) {
                await unpostPhotoMutation.mutateAsync(photoId);
            } else {
                await postPhotoMutation.mutateAsync(photoId);
            }
            onPhotoStatusChange?.(photoId, { posted: !isPosted })
        } catch (error) {
            console.error('Post photo error:', error)
            showToast("Failed to update post status", "error")
        }
    }

    const handleDeletePhoto = (photoId: string) => {
        if (onDelete && confirm("Are you sure you want to delete this photo?")) {
            onDelete(photoId)
        }
    }

    return {
        handleLikePhoto,
        handleFavoritePhoto,
        handlePostPhoto,
        handleDeletePhoto
    }
}
