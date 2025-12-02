import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Gallery } from "@/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface GalleryDateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gallery: Gallery | null;
    onSuccess?: () => void;
}

export function GalleryDateModal({ open, onOpenChange, gallery, onSuccess }: GalleryDateModalProps) {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (gallery?.shootDate) {
            setDate(new Date(gallery.shootDate));
        } else {
            setDate(undefined);
        }
    }, [gallery]);

    const handleSubmit = async () => {
        if (!gallery) return;

        try {
            setIsSubmitting(true);
            await api.updateGalleryDate(gallery.id, date ? date.toISOString() : null);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['galleries'] });

            showToast("Gallery date updated successfully", "success");
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update gallery date:", error);
            showToast("Failed to update gallery date", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Shoot Date</DialogTitle>
                    <DialogDescription>
                        Set the date when the photos were taken to organize this gallery in your timeline.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Shoot Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {date && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="self-start text-destructive hover:text-destructive"
                            onClick={() => setDate(undefined)}
                        >
                            Clear date (Uncategorized)
                        </Button>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
