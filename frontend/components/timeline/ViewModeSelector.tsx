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
        <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/50 backdrop-blur-sm">
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
                                "relative gap-2 px-4 py-2 h-9 rounded-lg transition-all duration-300",
                                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeViewMode"
                                    className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{mode.label}</span>
                            </span>
                        </Button>
                    );
                })}
            </div>

            {/* Sort Dropdown - Only show for "all" and "recent" views */}
            {onSortChange && (currentMode === 'all' || currentMode === 'recent') && (
                <Select value={sortBy} onValueChange={onSortChange}>
                    <SelectTrigger className="w-[180px] h-9 bg-muted/30 border-border/50">
                        <div className="flex items-center gap-2">
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
