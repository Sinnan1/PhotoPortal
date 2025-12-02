import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Images } from "lucide-react";
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
        <Card
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden"
            onClick={onClick}
        >
            <CardContent className="p-0">
                <div className="aspect-[4/3] relative bg-muted/30 overflow-hidden">
                    {coverPhoto ? (
                        <>
                            <Image
                                src={coverPhoto}
                                alt={monthName}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500 blur-[2px] group-hover:blur-0 opacity-70 group-hover:opacity-100"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                            <Calendar className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                    )}

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-md mb-2">
                            {monthName}
                        </h3>
                        <Badge variant="secondary" className="shadow-sm backdrop-blur-sm bg-background/80">
                            {galleryCount} Galleries
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
