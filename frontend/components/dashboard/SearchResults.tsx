import { Gallery } from "@/types";
import { Image as ImageIcon } from "lucide-react";
import { GalleryGrid } from "./GalleryGrid";

interface SearchResultsProps {
    results: any[];
    isLoading: boolean;
    query: string;
    onManageGroup: (gallery: Gallery) => void;
    onAddDate: (gallery: Gallery) => void;
    onShare: (gallery: Gallery) => void;
    onManageAccess: (gallery: Gallery) => void;
    onDelete: (id: string) => void;
}

export function SearchResults({
    results,
    isLoading,
    query,
    onManageGroup,
    onAddDate,
    onShare,
    onManageAccess,
    onDelete
}: SearchResultsProps) {
    if (results.length === 0 && !isLoading) {
        return (
            <div className="text-center py-32 border-2 border-dashed border-muted rounded-3xl bg-muted/5">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No results found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    We couldn't find any galleries matching "{query}". Try adjusting your search or filters.
                </p>
            </div>
        );
    }

    // Transform search results to match Gallery type expected by GalleryGrid
    const transformedGalleries: Gallery[] = results.map((g: any) => ({
        id: g.id,
        title: g.title,
        description: g.description || '',
        photoCount: g.photoCount || 0,
        downloadCount: 0,
        expiresAt: null,
        shootDate: g.shootDate,
        createdAt: g.createdAt || new Date().toISOString(),
        isExpired: false,
        folders: g.coverPhoto ? [{
            id: 'cover',
            name: 'Cover',
            coverPhoto: {
                id: 'cover-photo',
                filename: 'cover',
                thumbnailUrl: g.coverPhoto,
                originalUrl: g.coverPhoto,
                createdAt: new Date().toISOString(),
            },
            _count: { photos: g.photoCount || 0 },
        }] : [],
        likedBy: [],
        favoritedBy: [],
        totalSize: g.totalSize || 0,
        _count: {
            likedBy: g.likedBy || 0,
            favoritedBy: g.favoritedBy || 0,
            folders: g.folderCount || 0,
        },
    }));

    return (
        <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-6">
                Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </h2>

            <GalleryGrid
                galleries={transformedGalleries}
                isLoading={isLoading}
                onManageGroup={onManageGroup}
                onAddDate={onAddDate}
                onShare={onShare}
                onManageAccess={onManageAccess}
                onDelete={onDelete}
            />
        </div>
    );
}

