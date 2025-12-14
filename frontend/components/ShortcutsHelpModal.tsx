import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutsHelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const shortcuts = [
    {
        category: "General",
        items: [
            { keys: ["Esc"], description: "Close modals and dialogs" },
            { keys: ["?"], description: "Show keyboard shortcuts" },
        ],
    },
    {
        category: "Navigation",
        items: [
            { keys: ["Ctrl", "K"], description: "Focus search bar" },
            { keys: ["Cmd", "K"], description: "Focus search bar (Mac)" },
        ],
    },
    {
        category: "Actions",
        items: [
            { keys: ["N"], description: "Create new gallery" },
        ],
    },
];

export function ShortcutsHelpModal({ open, onOpenChange }: ShortcutsHelpModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    </div>
                    <DialogDescription>
                        Use these shortcuts to navigate faster
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {shortcuts.map((section) => (
                        <div key={section.category}>
                            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                {section.category}
                            </h3>
                            <div className="space-y-2">
                                {section.items.map((shortcut, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="text-sm">{shortcut.description}</span>
                                        <div className="flex gap-1">
                                            {shortcut.keys.map((key, keyIdx) => (
                                                <kbd
                                                    key={keyIdx}
                                                    className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
