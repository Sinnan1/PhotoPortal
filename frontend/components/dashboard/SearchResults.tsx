import { Gallery } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

interface SearchResultsProps {
    results: any[];
    isLoading: boolean;
    query: string;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-[4/3] bg-muted rounded-2xl" />
                ))}
            </div>
        );
    }

    if (results.length === 0) {
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

    return (
        <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-6">
                Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map((gallery) => (
                    <div
                        key={gallery.id}
                        className="group cursor-pointer"
                    >
                        <Link href={`/gallery/${gallery.id}`}>
                            <div className="relative aspect-[4/3] bg-muted rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                                {gallery.coverPhoto ? (
                                    <Image
                                        src={gallery.coverPhoto}
                                        alt={gallery.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <span className="text-muted-foreground">No Cover</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                                    {gallery.shootDate && (
                                        <p className="text-white/90 text-sm font-medium mb-1 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(gallery.shootDate), 'MMMM d, yyyy')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 px-2">
                                <h3 className="text-xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                                    {gallery.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {gallery.description || `${gallery.folderCount || 0} Folders`}
                                </p>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
