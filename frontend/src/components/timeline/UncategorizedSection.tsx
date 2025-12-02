import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertCircle, CalendarPlus } from "lucide-react";
import { Gallery } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface UncategorizedSectionProps {
    galleries: Gallery[];
    onAddDate: (gallery: Gallery) => void;
}

export function UncategorizedSection({ galleries, onAddDate }: UncategorizedSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (galleries.length === 0) return null;

    return (
        <div className="mb-8 border-2 border-dashed border-muted rounded-xl p-6 bg-muted/10">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Uncategorized Galleries</h3>
                        <p className="text-sm text-muted-foreground">
                            {galleries.length} galleries need dates to be organized in the timeline
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {galleries.map((gallery) => (
                        <Card key={gallery.id} className="overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex items-center p-2 gap-3">
                                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                    {gallery.folders?.[0]?.coverPhoto ? (
                                        <Image
                                            src={
                                                gallery.folders[0].coverPhoto.thumbnailUrl ||
                                                gallery.folders[0].coverPhoto.originalUrl ||
                                                "/placeholder.svg"
                                            }
                                            alt={gallery.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <AlertCircle className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate" title={gallery.title}>
                                        {gallery.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground truncate">
                                        Created {new Date(gallery.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddDate(gallery);
                                    }}
                                    title="Add Shoot Date"
                                >
                                    <CalendarPlus className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
