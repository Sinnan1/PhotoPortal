import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertCircle, CalendarPlus, Inbox } from "lucide-react";
import { Gallery } from "@/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UncategorizedSectionProps {
    galleries: Gallery[];
    onAddDate: (gallery: Gallery) => void;
}

export function UncategorizedSection({ galleries, onAddDate }: UncategorizedSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (galleries.length === 0) return null;

    return (
        <div className="mb-12">
            <div
                className={cn(
                    "group flex items-center justify-between cursor-pointer p-4 rounded-xl transition-all duration-300 border border-transparent",
                    isExpanded ? "bg-muted/30 border-border/50" : "hover:bg-muted/30 hover:border-border/50"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-xl transition-colors duration-300",
                        isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <Inbox className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            Uncategorized
                            <Badge variant="secondary" className="ml-2 rounded-full px-2.5">
                                {galleries.length}
                            </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Galleries waiting to be organized
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-in fade-in slide-in-from-top-4 duration-300 pl-4 border-l-2 border-border/50 ml-8">
                    {galleries.map((gallery) => (
                        <div
                            key={gallery.id}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300"
                        >
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted shadow-inner">
                                {gallery.folders?.[0]?.coverPhoto ? (
                                    <Image
                                        src={
                                            gallery.folders[0].coverPhoto.thumbnailUrl ||
                                            gallery.folders[0].coverPhoto.originalUrl ||
                                            "/placeholder.svg"
                                        }
                                        alt={gallery.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate text-foreground group-hover:text-primary transition-colors" title={gallery.title}>
                                    {gallery.title}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                    Created {new Date(gallery.createdAt).toLocaleDateString()}
                                </p>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs w-full justify-center"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddDate(gallery);
                                    }}
                                >
                                    <CalendarPlus className="w-3 h-3 mr-1.5" />
                                    Set Date
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
