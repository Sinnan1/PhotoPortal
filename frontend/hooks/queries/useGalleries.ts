import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Gallery } from "@/types";

export function useGalleries() {
    return useQuery({
        queryKey: ["galleries"],
        queryFn: async () => {
            const response = await api.getGalleries();
            return response.data as Gallery[];
        },
    });
}

export function useGallery(id: string, options?: { password?: string; refresh?: string }) {
    return useQuery({
        queryKey: ["gallery", id, options?.password, options?.refresh],
        queryFn: async () => {
            const response = await api.getGallery(id, options);
            return response.data as Gallery;
        },
        enabled: !!id,
        retry: (failureCount, error: any) => {
            // Don't retry if password is required (401/403)
            if (error.message?.toLowerCase().includes("password") || error.response?.status === 401 || error.response?.status === 403) {
                return false;
            }
            return failureCount < 3;
        }
    });
}

export function useCreateGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.createGallery(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useUpdateGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateGallery(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
            queryClient.invalidateQueries({ queryKey: ["gallery", variables.id] });
        },
    });
}

export function useDeleteGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteGallery(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useLikeGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.likeGallery(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useUnlikeGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.unlikeGallery(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useFavoriteGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.favoriteGallery(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useUnfavoriteGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.unfavoriteGallery(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["galleries"] });
        },
    });
}

export function useSearchGalleries(query: string, dateRange?: { from?: Date; to?: Date }) {
    return useQuery({
        queryKey: ['search', query, dateRange],
        queryFn: async () => {
            const response = await api.searchGalleries(
                query,
                dateRange?.from?.toISOString(),
                dateRange?.to?.toISOString()
            );
            return response.data;
        },
        enabled: !!query || !!dateRange?.from,
    });
}
