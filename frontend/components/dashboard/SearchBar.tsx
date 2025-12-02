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
        <div className={cn("relative flex items-center gap-2", className)}>
            <div className={cn(
                "flex items-center bg-muted/50 rounded-full border border-transparent focus-within:border-primary/20 focus-within:bg-muted transition-all duration-300 overflow-hidden",
                isExpanded ? "w-full md:w-[400px]" : "w-10 md:w-[300px]"
            )}>
                <div className="pl-3 text-muted-foreground">
                    <Search className="w-4 h-4" />
                </div>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search galleries..."
                    className="border-0 bg-transparent focus-visible:ring-0 h-10 w-full"
                    onFocus={() => setIsExpanded(true)}
                    onBlur={() => !hasActiveFilters && setIsExpanded(false)}
                />
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mr-1 rounded-full hover:bg-background/50"
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
                            "rounded-full shrink-0",
                            dateRange?.from && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
