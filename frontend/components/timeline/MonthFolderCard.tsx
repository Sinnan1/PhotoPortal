import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MonthFolderCardProps {
    month: number;
    monthName: string;
    galleryCount: number;
    onClick: () => void;
}

export function MonthFolderCard({ month, monthName, galleryCount, onClick }: MonthFolderCardProps) {
    return (
        <Card
            className="group cursor-pointer border-0 bg-transparent shadow-none"
            onClick={onClick}
        >
            <CardContent className="p-0">
                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-white/40 dark:bg-card/40 border border-zinc-200/50 dark:border-border/50 transition-all duration-500 hover:border-zinc-300/50 dark:hover:border-border hover:bg-white/60 dark:hover:bg-card/60 shadow-sm hover:shadow-md">

                    {/* Abstract Background Decoration */}
                    <div className="absolute -right-4 -top-12 text-[120px] font-serif font-black text-zinc-900/[0.02] dark:text-foreground/[0.02] tracking-tighter select-none transition-transform duration-700 group-hover:scale-110 group-hover:text-zinc-900/[0.04] dark:group-hover:text-foreground/[0.04] group-hover:-translate-y-2">
                        {month.toString().padStart(2, '0')}
                    </div>

                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                        <div className="transform transition-transform duration-500 group-hover:-translate-y-1">
                            <h3 className="font-serif text-3xl font-medium tracking-wide text-zinc-700 dark:text-foreground/90 mb-2 group-hover:text-zinc-900 dark:group-hover:text-foreground transition-colors">
                                {monthName}
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="h-[1px] w-8 bg-zinc-900/20 dark:bg-border/40 group-hover:w-12 group-hover:bg-zinc-900/40 dark:group-hover:bg-border/60 transition-all duration-500" />
                                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-muted-foreground font-medium group-hover:text-foreground dark:group-hover:text-foreground transition-colors">
                                    {galleryCount} {galleryCount === 1 ? 'Gallery' : 'Galleries'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-t from-black/5 dark:from-black/20 via-transparent to-transparent" />
                </div>
            </CardContent>
        </Card>
    );
}
