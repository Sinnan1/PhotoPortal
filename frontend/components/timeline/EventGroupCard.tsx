'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Folder, Images } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventGroupCardProps {
    group: {
        id: string;
        name: string;
        description?: string | null;
        galleryCount: number;
        coverPhoto: string | null;
    };
    onClick: () => void;
}

export function EventGroupCard({ group, onClick }: EventGroupCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <Card
                className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer bg-card"
                onClick={onClick}
            >
                {/* Cover Photo or Placeholder */}
                <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                    {group.coverPhoto ? (
                        <Image
                            src={group.coverPhoto}
                            alt={group.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                            <Folder className="w-16 h-16 text-muted-foreground/20" strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="shadow-sm backdrop-blur-md bg-background/80 hover:bg-background/90">
                            <Folder className="w-3 h-3 mr-1" />
                            Group
                        </Badge>
                    </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate mb-1 text-card-foreground group-hover:text-primary transition-colors">
                                {group.name}
                            </h3>
                            {group.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {group.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Images className="w-3.5 h-3.5" />
                        <span>
                            {group.galleryCount} {group.galleryCount === 1 ? 'Gallery' : 'Galleries'}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

