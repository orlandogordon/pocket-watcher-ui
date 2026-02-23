import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
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
import { apiFetch } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateBudget } from '@/hooks/useBudgets';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import type { BudgetResponse } from '@/types/budgets';

const categoryRowSchema = z.object({
  id: z.string().optional(),
  category_uuid: z.string().min(1, 'Select a category'),
  allocated_amount: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 500.00)'),
});

const schema = z
  .object({
    budget_name: z.string().min(1, 'Name is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    categories: z.array(categoryRowSchema),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

type FormValues = z.infer<typeof schema>;

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: BudgetResponse;
}

export function BudgetFormDialog({ open, onOpenChange, budget }: BudgetFormDialogProps) {
  const isEdit = !!budget;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const qc = useQueryClient();
  const createBudget = useCreateBudget();
  const { data: categories } = useCategories();

  const categoryMap = buildCategoryMap(categories ?? []);

  // Sort categories: parents first, then children, alphabetically
  const sortedCategories = [...(categories ?? [])].sort((a, b) => {
    const aLabel = getCategoryLabel(a.id, categoryMap);
    const bLabel = getCategoryLabel(b.id, categoryMap);
    return aLabel.localeCompare(bLabel);
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      budget_name: '',
      start_date: '',
      end_date: '',
      categories: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'categories',
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({
        budget_name: budget?.budget_name ?? '',
        start_date: budget?.start_date ?? '',
        end_date: budget?.end_date ?? '',
        categories:
          budget?.budget_categories.map((bc) => ({
            id: bc.id,
            category_uuid: bc.category.id,
            allocated_amount: bc.allocated_amount,
          })) ?? [],
      });
    }
  }, [open, budget, form]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsPending(true);
    try {
      if (isEdit && budget) {
        // Update budget metadata
        await apiFetch(`/budgets/${budget.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            budget_name: values.budget_name,
            start_date: values.start_date,
            end_date: values.end_date,
          }),
        });

        // Reconcile categories
        const originalMap = new Map(budget.budget_categories.map((bc) => [bc.id, bc]));
        const formIds = new Set(values.categories.map((c) => c.id).filter(Boolean));

        // Delete removed categories
        const toDelete = budget.budget_categories.filter((bc) => !formIds.has(bc.id));
        // Update changed categories
        const toUpdate = values.categories.filter(
          (fc) =>
            fc.id &&
            originalMap.has(fc.id) &&
            originalMap.get(fc.id)!.allocated_amount !== fc.allocated_amount,
        );
        // Add new categories
        const toAdd = values.categories.filter((fc) => !fc.id);

        await Promise.all([
          ...toDelete.map((bc) =>
            apiFetch(`/budgets/categories/${bc.id}`, { method: 'DELETE' }),
          ),
          ...toUpdate.map((fc) =>
            apiFetch(`/budgets/categories/${fc.id}`, {
              method: 'PUT',
              body: JSON.stringify({ allocated_amount: fc.allocated_amount }),
            }),
          ),
          ...toAdd.map((fc) =>
            apiFetch(`/budgets/${budget.id}/categories/`, {
              method: 'POST',
              body: JSON.stringify({
                category_uuid: fc.category_uuid,
                allocated_amount: fc.allocated_amount,
              }),
            }),
          ),
        ]);

        qc.invalidateQueries({ queryKey: ['budgets'] });
      } else {
        await createBudget.mutateAsync({
          budget_name: values.budget_name,
          start_date: values.start_date,
          end_date: values.end_date,
          categories: values.categories.map((c) => ({
            category_uuid: c.category_uuid,
            allocated_amount: c.allocated_amount,
          })),
        });
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsPending(false);
    }
  }

  // Track which category_uuids are already used in the form
  const usedCategoryUuids = new Set(
    form.watch('categories').map((c) => c.category_uuid).filter(Boolean),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Budget' : 'New Budget'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
            className="space-y-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="budget_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. February 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category Allocations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Category Allocations</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ category_uuid: '', allocated_amount: '' })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  No categories added yet. Click Add to set spending limits.
                </p>
              )}

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    {/* Category select */}
                    <FormField
                      control={form.control}
                      name={`categories.${index}.category_uuid`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={f.onChange}
                            value={f.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortedCategories.map((cat) => {
                                const isUsedElsewhere =
                                  usedCategoryUuids.has(cat.id) && f.value !== cat.id;
                                return (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id}
                                    disabled={isUsedElsewhere}
                                  >
                                    {getCategoryLabel(cat.id, categoryMap)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Amount input */}
                    <FormField
                      control={form.control}
                      name={`categories.${index}.allocated_amount`}
                      render={({ field: f }) => (
                        <FormItem className="w-28">
                          <FormControl>
                            <Input placeholder="0.00" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:text-destructive mt-0.5"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
