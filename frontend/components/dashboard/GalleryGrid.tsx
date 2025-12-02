import { Gallery } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Eye, Heart, Images, MoreHorizontal, Share2, Star, Trash2, Users, Edit } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GalleryGridProps {
    galleries: Gallery[];
    isLoading: boolean;
    onManageGroup: (gallery: Gallery) => void;
    onAddDate: (gallery: Gallery) => void;
    onShare: (gallery: Gallery) => void;
    onManageAccess: (gallery: Gallery) => void;
    onDelete: (id: string) => void;
    onCreateGallery?: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function GalleryGrid({
    galleries,
    isLoading,
    onManageGroup,
    onAddDate,
    onShare,
    onManageAccess,
    onDelete,
    onCreateGallery
}: GalleryGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-border/50 bg-card">
                        <div className="aspect-[4/3] bg-muted animate-pulse"></div>
                        <div className="p-6 space-y-3">
                            <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (galleries.length === 0) {
        return (
            <div className="text-center py-32 border-2 border-dashed border-muted rounded-3xl bg-muted/5">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Images className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No galleries found</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                    Get started by creating your first gallery to organize and share your photos.
                </p>
                {onCreateGallery && (
                    <Button onClick={onCreateGallery} size="lg" className="rounded-full px-8">
                        <Images className="mr-2 h-5 w-5" />
                        Create Gallery
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries.map((gallery, index) => (
                <div
                    key={gallery.id}
                    className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                >
                    {/* Cover Image */}
                    <Link href={`/gallery/${gallery.id}`}>
                        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                            {gallery.folders && gallery.folders.length > 0 && gallery.folders[0].coverPhoto ? (
                                <Image
                                    src={
                                        gallery.folders[0].coverPhoto.largeUrl ||
                                        gallery.folders[0].coverPhoto.mediumUrl ||
                                        gallery.folders[0].coverPhoto.thumbnailUrl ||
                                        "/placeholder.svg"
                                    }
                                    alt={gallery.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                    priority={index < 3}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                    <Images className="w-16 h-16 text-muted-foreground/20" />
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Quick actions on hover */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-10 w-10 rounded-full shadow-lg backdrop-blur-md bg-white/90 hover:bg-white"
                                        >
                                            <MoreHorizontal className="h-5 w-5 text-black" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                            <Link href={`/gallery/${gallery.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Gallery
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                            <Link href={`/galleries/${gallery.id}/manage`}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Gallery
                                            </Link>
                                        </DropdownMenuItem>
                                        {/* Temporarily disabled - Event grouping feature removed
                                        <DropdownMenuItem
                                            className="rounded-lg cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onManageGroup(gallery);
                                            }}
                                        >
                                            <Users className="mr-2 h-4 w-4" />
                                            Manage Group
                                        </DropdownMenuItem>
                                        */}
                                        <DropdownMenuItem
                                            className="rounded-lg cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onAddDate(gallery);
                                            }}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Set Shoot Date
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="rounded-lg cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onShare(gallery);
                                            }}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="rounded-lg cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onManageAccess(gallery);
                                            }}
                                        >
                                            <Users className="mr-2 h-4 w-4" />
                                            Manage Access
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onDelete(gallery.id);
                                            }}
                                            className="text-destructive focus:text-destructive rounded-lg cursor-pointer"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Gallery
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Expired badge */}
                            {gallery.isExpired && (
                                <div className="absolute top-4 left-4">
                                    <Badge variant="destructive" className="shadow-lg rounded-full px-3 py-1">
                                        Expired
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* Card Content */}
                    <div className="p-6">
                        <Link href={`/gallery/${gallery.id}`}>
                            <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors font-audrey tracking-wide">
                                {gallery.title}
                            </h3>
                        </Link>

                        {gallery.description && (
                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 font-light">
                                {gallery.description}
                            </p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                                <Images className="h-4 w-4 text-primary mb-1.5" />
                                <span className="text-lg font-semibold">
                                    {gallery.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Photos</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                                <Heart className="h-4 w-4 text-red-500 mb-1.5" />
                                <span className="text-lg font-semibold">{gallery._count?.likedBy ?? 0}</span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Liked</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                                <Star className="h-4 w-4 text-yellow-500 mb-1.5" />
                                <span className="text-lg font-semibold">{gallery._count?.favoritedBy ?? 0}</span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Favs</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Calendar className="h-3.5 w-3.5" />
                                {gallery.shootDate ? (
                                    <span>{new Date(gallery.shootDate).toLocaleDateString()}</span>
                                ) : (
                                    <span>{new Date(gallery.createdAt).toLocaleDateString()}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                <Download className="h-3.5 w-3.5 mr-1" />
                                <span>{formatFileSize(gallery.totalSize || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
