import { useState } from "react"

export function useImagePreload() {
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

    const handleImageLoad = (photoId: string) => {
        setLoadedImages(prev => {
            if (prev.has(photoId)) return prev
            const newSet = new Set(prev)
            newSet.add(photoId)
            return newSet
        })
    }

    return {
        loadedImages,
        handleImageLoad
    }
}
