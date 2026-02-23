import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTag, useUpdateTag } from '@/hooks/useTags';
import type { TagResponse } from '@/types/transactions';

const schema = z.object({
  tag_name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
});

type FormValues = z.infer<typeof schema>;

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: TagResponse;
}

export function TagFormDialog({ open, onOpenChange, tag }: TagFormDialogProps) {
  const isEdit = !!tag;
  const create = useCreateTag();
  const update = useUpdateTag();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tag_name: '', color: '#6366f1' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        tag_name: tag?.tag_name ?? '',
        color: tag?.color ?? '#6366f1',
      });
    }
  }, [open, tag, form]);

  function onSubmit(values: FormValues) {
    if (isEdit && tag) {
      update.mutate({ uuid: tag.id, data: values }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(values, { onSuccess: () => onOpenChange(false) });
    }
  }

  const isPending = create.isPending || update.isPending;
  const error = create.error || update.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Tag' : 'Add Tag'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="tag_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Recurring" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-0.5"
                      />
                      <Input
                        placeholder="#6366f1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Tag'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
