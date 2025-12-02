'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const groupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    shootDate: z.date().optional().nullable(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface GalleryGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    groupToEdit?: {
        id: string;
        name: string;
        description?: string | null;
        shootDate?: string | null;
    } | null;
}

export function GalleryGroupModal({ isOpen, onClose, initialDate, groupToEdit }: GalleryGroupModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<GroupFormData>({
        resolver: zodResolver(groupSchema),
        defaultValues: {
            name: '',
            description: '',
            shootDate: initialDate || new Date(),
        },
    });

    const shootDate = watch('shootDate');

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setValue('name', groupToEdit.name);
                setValue('description', groupToEdit.description || '');
                setValue('shootDate', groupToEdit.shootDate ? new Date(groupToEdit.shootDate) : null);
            } else {
                reset({
                    name: '',
                    description: '',
                    shootDate: initialDate || new Date(),
                });
            }
        }
    }, [isOpen, groupToEdit, initialDate, setValue, reset]);

    const onSubmit = async (data: GroupFormData) => {
        try {
            setIsSubmitting(true);

            if (groupToEdit) {
                await api.updateGalleryGroup(groupToEdit.id, {
                    ...data,
                    shootDate: data.shootDate ? data.shootDate.toISOString() : null,
                });
                toast.success('Group updated successfully');
            } else {
                await api.createGalleryGroup({
                    ...data,
                    shootDate: data.shootDate ? data.shootDate.toISOString() : null,
                });
                toast.success('Group created successfully');
            }

            queryClient.invalidateQueries({ queryKey: ['galleries', 'timeline'] });
            onClose();
        } catch (error) {
            console.error('Failed to save group:', error);
            toast.error('Failed to save group');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{groupToEdit ? 'Edit Event Group' : 'Create Event Group'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Group Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Wedding, Corporate Event"
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Add a brief description..."
                            className="resize-none"
                            {...register('description')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Event Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !shootDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {shootDate ? format(shootDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={shootDate || undefined}
                                    onSelect={(date) => setValue('shootDate', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {groupToEdit ? 'Save Changes' : 'Create Group'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
