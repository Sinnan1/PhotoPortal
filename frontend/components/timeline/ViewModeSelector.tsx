import { Button } from "@/components/ui/button";
import { Calendar, Grid, Clock, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type ViewMode = 'timeline' | 'all' | 'recent';

interface ViewModeSelectorProps {
    currentMode: ViewMode;
    onChange: (mode: ViewMode) => void;
    sortBy?: string;
    onSortChange?: (sort: string) => void;
}

export function ViewModeSelector({ currentMode, onChange, sortBy, onSortChange }: ViewModeSelectorProps) {
    const modes = [
        { id: 'timeline', label: 'Timeline', icon: Calendar },
        { id: 'all', label: 'All Galleries', icon: Grid },
        { id: 'recent', label: 'Recent', icon: Clock },
    ] as const;

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
            {/* ViewMode Selector */}
            <div className="flex items-center gap-1 sm:gap-2 bg-zinc-100/50 dark:bg-card/40 p-1 sm:p-1.5 rounded-xl border border-zinc-200/50 dark:border-border/50 backdrop-blur-sm w-full sm:w-auto overflow-x-auto no-scrollbar justify-between sm:justify-start">
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = currentMode === mode.id;

                    return (
                        <Button
                            key={mode.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => onChange(mode.id)}
                            className={cn(
                                "relative gap-2 px-3 sm:px-6 py-2 sm:py-2.5 h-9 sm:h-10 rounded-lg transition-all duration-300 flex-1 sm:flex-none justify-center",
                                isActive
                                    ? "text-white dark:text-background"
                                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeViewMode"
                                    className="absolute inset-0 bg-zinc-900 dark:bg-foreground rounded-lg shadow-sm"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{mode.label}</span>
                            </span>
                        </Button>
                    );
                })}
            </div>

            {/* Sort Dropdown */}
            {onSortChange && (currentMode === 'all' || currentMode === 'recent') && (
                <Select value={sortBy} onValueChange={onSortChange}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-zinc-100/50 dark:bg-card/40 border-zinc-200/50 dark:border-border/50 backdrop-blur-sm focus:ring-0">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ArrowUpDown className="h-4 w-4" />
                            <SelectValue placeholder="Sort by..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Date (newest)</SelectItem>
                        <SelectItem value="date-asc">Date (oldest)</SelectItem>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        <SelectItem value="likes">Most liked</SelectItem>
                        <SelectItem value="size">Largest size</SelectItem>
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
