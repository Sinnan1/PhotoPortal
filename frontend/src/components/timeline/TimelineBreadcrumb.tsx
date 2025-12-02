import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimelineBreadcrumbProps {
    year: number | null;
    month: number | null;
    monthName: string | null;
    groupName?: string | null;
    onYearClick: (year: number) => void;
    onMonthClick?: () => void;
    onHomeClick: () => void;
}

export function TimelineBreadcrumb({
    year,
    month,
    monthName,
    groupName,
    onYearClick,
    onMonthClick,
    onHomeClick
}: TimelineBreadcrumbProps) {
    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-8 overflow-x-auto pb-2 scrollbar-none">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-medium hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={onHomeClick}
            >
                <Home className="w-4 h-4 mr-2" />
                Timeline
            </Button>

            {year && (
                <>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground/50" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 px-2 font-medium hover:text-primary hover:bg-primary/5 transition-colors",
                            !month && "text-foreground font-bold pointer-events-none"
                        )}
                        onClick={() => month && onYearClick(year)}
                    >
                        {year}
                    </Button>
                </>
            )}

            {month && monthName && (
                <>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground/50" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 px-2 font-medium hover:text-primary hover:bg-primary/5 transition-colors",
                            !groupName && "text-foreground font-bold pointer-events-none"
                        )}
                        onClick={() => groupName && onMonthClick?.()}
                    >
                        {monthName}
                    </Button>
                </>
            )}

            {groupName && (
                <>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground/50" />
                    <span className="font-bold text-foreground px-2 py-1 rounded-md bg-muted/50">
                        {groupName}
                    </span>
                </>
            )}
        </div>
    );
}
