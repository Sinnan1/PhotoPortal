import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PhotoWithContext } from "@/types";

export function useLikedPhotos() {
    return useQuery({
        queryKey: ["liked-photos"],
        queryFn: async () => {
            const response = await api.getLikedPhotos();
            return response.data as PhotoWithContext[];
        },
    });
}

export function useFavoritedPhotos() {
    return useQuery({
        queryKey: ["favorite-photos"],
        queryFn: async () => {
            const response = await api.getFavoritedPhotos();
            return response.data as PhotoWithContext[];
        },
    });
}

export function usePostedPhotos() {
    return useQuery({
        queryKey: ["posted-photos"],
        queryFn: async () => {
            const response = await api.getPosts();
            return response.data as PhotoWithContext[];
        },
    });
}

export function useLikePhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.likePhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["liked-photos"] });
        },
    });
}

export function useUnlikePhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.unlikePhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["liked-photos"] });
        },
    });
}

export function useFavoritePhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.favoritePhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["favorite-photos"] });
        },
    });
}

export function useUnfavoritePhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.unfavoritePhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["favorite-photos"] });
        },
    });
}

export function usePostPhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.postPhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["posted-photos"] });
        },
    });
}

export function useUnpostPhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.unpostPhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
            queryClient.invalidateQueries({ queryKey: ["posted-photos"] });
        },
    });
}

export function useDeletePhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => api.deletePhoto(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
            queryClient.invalidateQueries({ queryKey: ["folder"] });
        },
    });
}
