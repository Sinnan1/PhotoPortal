import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface YearFolderCardProps {
    year: number;
    galleryCount: number;
    onClick: () => void;
}

export function YearFolderCard({ year, galleryCount, onClick }: YearFolderCardProps) {
    return (
        <Card
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden"
            onClick={onClick}
        >
            <CardContent className="p-0">
                <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center relative group-hover:scale-105 transition-transform duration-500">
                    <div className="text-6xl font-bold text-muted-foreground/20 group-hover:text-primary/20 transition-colors">
                        {year}
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Calendar className="w-12 h-12 mb-4 text-primary opacity-80" />
                        <h3 className="text-3xl font-bold tracking-tight">{year}</h3>
                        <Badge variant="secondary" className="mt-2">
                            {galleryCount} Galleries
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
