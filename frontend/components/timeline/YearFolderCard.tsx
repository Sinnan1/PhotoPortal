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
        <div
            className="group cursor-pointer relative"
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Card className="relative h-full border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group-hover:-translate-y-1">
                <CardContent className="p-0">
                    <div className="aspect-[4/3] flex flex-col items-center justify-center relative">
                        <div className="relative z-10 text-center">
                            <h3 className="text-5xl font-audrey font-bold tracking-tighter text-foreground/90 group-hover:text-primary transition-colors duration-500">
                                {year}
                            </h3>
                            <div className="h-1 w-12 bg-primary/20 mx-auto my-3 rounded-full group-hover:w-20 group-hover:bg-primary/50 transition-all duration-500" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                                {galleryCount} {galleryCount === 1 ? 'Gallery' : 'Galleries'}
                            </p>
                        </div>

                        {/* Decorative background elements */}
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
