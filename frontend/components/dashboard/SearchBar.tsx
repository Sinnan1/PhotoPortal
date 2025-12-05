import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    onSearch: (query: string, dateRange: DateRange | undefined) => void;
    className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(query, dateRange);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, dateRange, onSearch]);

    const handleClear = () => {
        setQuery("");
        setDateRange(undefined);
        onSearch("", undefined);
    };

    const hasActiveFilters = query || dateRange?.from;

    return (
        <div className={cn("relative flex items-center gap-3", className)}>
            <div className={cn(
                "flex items-center rounded-xl border border-zinc-200/50 dark:border-border/50 bg-white/40 dark:bg-card/40 backdrop-blur-md transition-all duration-500 overflow-hidden",
                "hover:border-zinc-300/50 dark:hover:border-border hover:bg-white/60 dark:hover:bg-card/60",
                "focus-within:border-primary/20 focus-within:bg-white/80 dark:focus-within:bg-muted/80 focus-within:ring-1 focus-within:ring-primary/20",
                isExpanded ? "w-full md:w-[450px]" : "w-10 md:w-[320px]"
            )}>
                <div className="pl-4 text-muted-foreground/50 group-focus-within:text-primary/50 transition-colors">
                    <Search className="w-4 h-4" />
                </div>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search galleries..."
                    className="border-0 bg-transparent focus-visible:ring-0 h-11 w-full text-sm placeholder:text-muted-foreground/40 text-foreground"
                    onFocus={() => setIsExpanded(true)}
                    onBlur={() => !hasActiveFilters && setIsExpanded(false)}
                />
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mr-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
                        onClick={handleClear}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                )}
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={dateRange?.from ? "secondary" : "ghost"}
                        size="icon"
                        className={cn(
                            "rounded-xl h-11 w-11 shrink-0 border border-transparent transition-all duration-300",
                            dateRange?.from
                                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-card/40 border-zinc-200/50 dark:border-border/50"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border/50 bg-background/95 backdrop-blur-xl" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        className="p-3"
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
