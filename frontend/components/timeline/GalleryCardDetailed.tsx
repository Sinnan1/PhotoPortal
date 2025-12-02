import { Card } from "@/components/ui/card";
import { Calendar, Download, Heart, Images, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface GalleryCardDetailedProps {
    gallery: {
        id: string;
        title: string;
        description?: string | null;
        shootDate: string;
        coverPhoto: string | null;
        photoCount: number;
        likedBy: number;
        favoritedBy: number;
        totalSize: number;
    };
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function GalleryCardDetailed({ gallery }: GalleryCardDetailedProps) {
    return (
        <Link href={`/gallery/${gallery.id}`}>
            <Card className="group relative h-full border-border/50 overflow-hidden bg-card shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                {/* Cover Image */}
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {gallery.coverPhoto ? (
                        <Image
                            src={gallery.coverPhoto}
                            alt={gallery.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <Images className="w-16 h-16 text-muted-foreground/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Card Content */}
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors font-audrey tracking-wide">
                        {gallery.title}
                    </h3>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                            <Images className="h-4 w-4 text-primary mb-1.5" />
                            <span className="text-lg font-semibold">{gallery.photoCount}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Photos</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                            <Heart className="h-4 w-4 text-red-500 mb-1.5" />
                            <span className="text-lg font-semibold">{gallery.likedBy}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Liked</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-xl transition-colors group-hover:bg-muted/50">
                            <Star className="h-4 w-4 text-yellow-500 mb-1.5" />
                            <span className="text-lg font-semibold">{gallery.favoritedBy}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Favs</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(gallery.shootDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span>{formatFileSize(gallery.totalSize)}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
