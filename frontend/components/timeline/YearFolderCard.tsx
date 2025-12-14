import { Card, CardContent } from "@/components/ui/card";

interface YearFolderCardProps {
    year: number;
    galleryCount: number;
    onClick: () => void;
}

export function YearFolderCard({ year, galleryCount, onClick }: YearFolderCardProps) {
    return (
        <Card
            className="group cursor-pointer border-0 bg-transparent shadow-none"
            onClick={onClick}
        >
            <CardContent className="p-0">
                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-white/40 dark:bg-card/40 border border-zinc-200/50 dark:border-border/50 transition-all duration-500 hover:border-zinc-300/50 dark:hover:border-border hover:bg-white/60 dark:hover:bg-card/60 shadow-sm hover:shadow-md">

                    {/* Abstract Background Year */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[140px] font-serif font-black text-zinc-900/[0.03] dark:text-foreground/[0.03] tracking-tighter select-none transition-all duration-700 group-hover:scale-110 group-hover:text-zinc-900/[0.05] dark:group-hover:text-foreground/[0.05]">
                            {year}
                        </span>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                        <div className="transform transition-transform duration-500 group-hover:-translate-y-1 text-center">
                            <h3 className="font-serif text-5xl font-medium tracking-wide text-zinc-700 dark:text-foreground/90 mb-3 group-hover:text-zinc-900 dark:group-hover:text-foreground transition-colors">
                                {year}
                            </h3>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-[1px] w-6 bg-zinc-900/20 dark:bg-border/40 group-hover:w-10 group-hover:bg-zinc-900/40 dark:group-hover:bg-border/60 transition-all duration-500" />
                                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-muted-foreground font-medium group-hover:text-foreground dark:group-hover:text-foreground transition-colors">
                                    {galleryCount} {galleryCount === 1 ? 'Gallery' : 'Galleries'}
                                </span>
                                <div className="h-[1px] w-6 bg-zinc-900/20 dark:bg-border/40 group-hover:w-10 group-hover:bg-zinc-900/40 dark:group-hover:bg-border/60 transition-all duration-500" />
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
