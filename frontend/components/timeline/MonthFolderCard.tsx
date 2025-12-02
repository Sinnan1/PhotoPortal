import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import Image from "next/image";

interface MonthFolderCardProps {
    month: number;
    monthName: string;
    galleryCount: number;
    coverPhoto: string | null;
    onClick: () => void;
}

export function MonthFolderCard({ month, monthName, galleryCount, coverPhoto, onClick }: MonthFolderCardProps) {
    return (
        <div
            className="group cursor-pointer relative"
            onClick={onClick}
        >
            <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <Card className="relative h-full border-0 overflow-hidden bg-card shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                <CardContent className="p-0">
                    <div className="aspect-[4/3] relative overflow-hidden">
                        {coverPhoto ? (
                            <>
                                <Image
                                    src={coverPhoto}
                                    alt={monthName}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                <Calendar className="w-10 h-10 text-muted-foreground/20" />
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <h3 className="text-2xl font-audrey font-bold tracking-wide text-white mb-1 drop-shadow-lg">
                                {monthName}
                            </h3>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md text-xs">
                                    {galleryCount} {galleryCount === 1 ? 'Gallery' : 'Galleries'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
