import { Button } from "@/components/ui/button";
import { Calendar, Grid, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type ViewMode = 'timeline' | 'all' | 'recent';

interface ViewModeSelectorProps {
    currentMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
    const modes = [
        { id: 'timeline', label: 'Timeline', icon: Calendar },
        { id: 'all', label: 'All Galleries', icon: Grid },
        { id: 'recent', label: 'Recent', icon: Clock },
    ] as const;

    return (
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
    );
}
