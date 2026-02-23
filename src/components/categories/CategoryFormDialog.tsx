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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import type { CategoryResponse } from '@/types/categories';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  parent_category_uuid: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryResponse;
  /** Top-level categories available as parent options */
  topLevelCategories: CategoryResponse[];
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  topLevelCategories,
}: CategoryFormDialogProps) {
  const isEdit = !!category;
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parent_category_uuid: undefined },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? '',
        parent_category_uuid: category?.parent_category_uuid ?? undefined,
      });
    }
  }, [open, category, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      parent_category_uuid: values.parent_category_uuid || undefined,
    };

    if (isEdit && category) {
      update.mutate({ uuid: category.id, data: payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  const isPending = create.isPending || update.isPending;
  const error = create.error || update.error;

  // When editing a parent category, don't offer parent selection (avoid making it a child)
  const isParentCategory = category && !category.parent_category_uuid;
  const showParentSelect = !isParentCategory;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showParentSelect && (
              <FormField
                control={form.control}
                name="parent_category_uuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                      value={field.value ?? '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (top-level)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None (top-level)</SelectItem>
                        {topLevelCategories
                          .filter((c) => c.id !== category?.id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
