import { Button } from "@/components/ui/button";
import { Calendar, Grid, Clock } from "lucide-react";

export type ViewMode = 'timeline' | 'all' | 'recent';

interface ViewModeSelectorProps {
    currentMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
    return (
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
            <Button
                variant={currentMode === 'timeline' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onChange('timeline')}
                className="gap-2"
            >
                <Calendar className="w-4 h-4" />
                Timeline
            </Button>
            <Button
                variant={currentMode === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onChange('all')}
                className="gap-2"
            >
                <Grid className="w-4 h-4" />
                All Galleries
            </Button>
            <Button
                variant={currentMode === 'recent' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onChange('recent')}
                className="gap-2"
            >
                <Clock className="w-4 h-4" />
                Recent
            </Button>
        </div>
    );
}
