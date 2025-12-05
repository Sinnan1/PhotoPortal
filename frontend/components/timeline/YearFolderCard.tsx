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
                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-zinc-900/50 border border-white/5 transition-all duration-500 group-hover:border-white/10 group-hover:bg-zinc-800/80">

                    {/* Abstract Background Year */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[140px] font-serif font-black text-white/[0.03] tracking-tighter select-none transition-all duration-700 group-hover:scale-110 group-hover:text-white/[0.05]">
                            {year}
                        </span>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                        <div className="transform transition-transform duration-500 group-hover:-translate-y-1 text-center">
                            <h3 className="font-serif text-5xl font-medium tracking-wide text-white/90 mb-3 group-hover:text-white transition-colors">
                                {year}
                            </h3>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-[1px] w-6 bg-white/20 group-hover:w-10 group-hover:bg-white/40 transition-all duration-500" />
                                <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-medium group-hover:text-white/60 transition-colors">
                                    {galleryCount} {galleryCount === 1 ? 'Gallery' : 'Galleries'}
                                </span>
                                <div className="h-[1px] w-6 bg-white/20 group-hover:w-10 group-hover:bg-white/40 transition-all duration-500" />
                            </div>
                        </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
            </CardContent>
        </Card>
    );
}
