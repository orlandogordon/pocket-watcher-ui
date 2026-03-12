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
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTemplate } from '@/hooks/useBudgets';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import type { BudgetTemplateResponse } from '@/types/budgets';

const categoryRowSchema = z.object({
  id: z.string().optional(),
  category_uuid: z.string().min(1, 'Select a category'),
  subcategory_uuid: z.union([z.string(), z.literal('')]).optional(),
  allocated_amount: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 500.00)'),
});

const schema = z.object({
  template_name: z.string().min(1, 'Name is required'),
  is_default: z.boolean(),
  categories: z.array(categoryRowSchema),
});

type FormValues = z.infer<typeof schema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: BudgetTemplateResponse;
}

export function TemplateFormDialog({ open, onOpenChange, template }: TemplateFormDialogProps) {
  const isEdit = !!template;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const qc = useQueryClient();
  const createTemplate = useCreateTemplate();
  const { data: categories } = useCategories();

  const categoryMap = buildCategoryMap(categories ?? []);

  // Build flat list of all categories (parents + children)
  const allCategories = (categories ?? []).flatMap((cat) => [
    cat,
    ...(cat.children ?? []),
  ]);

  // Separate parents and children
  const parentCategories = (categories ?? []).filter((c) => !c.parent_category_uuid);
  const childrenByParent = new Map<string, typeof allCategories>();
  for (const cat of allCategories) {
    if (cat.parent_category_uuid) {
      const existing = childrenByParent.get(cat.parent_category_uuid) ?? [];
      existing.push(cat);
      childrenByParent.set(cat.parent_category_uuid, existing);
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      template_name: '',
      is_default: false,
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
        template_name: template?.template_name ?? '',
        is_default: template?.is_default ?? false,
        categories:
          template?.categories.map((tc) => ({
            id: tc.id,
            category_uuid: tc.category.id,
            subcategory_uuid: tc.subcategory?.id ?? '',
            allocated_amount: tc.allocated_amount,
          })) ?? [],
      });
    }
  }, [open, template, form]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsPending(true);
    try {
      const buildPayloadCategory = (c: FormValues['categories'][number]) => ({
        category_uuid: c.category_uuid,
        subcategory_uuid: c.subcategory_uuid || null,
        allocated_amount: c.allocated_amount,
      });

      if (isEdit && template) {
        // Update template metadata
        await apiFetch(`/budgets/templates/${template.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            template_name: values.template_name,
            is_default: values.is_default,
          }),
        });

        // Reconcile categories
        const originalMap = new Map(template.categories.map((tc) => [tc.id, tc]));
        const formIds = new Set(values.categories.map((c) => c.id).filter(Boolean));

        // Detect rows where category/subcategory changed — need delete + re-create
        // (PUT only supports allocated_amount, not category reassignment)
        const categoryChanged = values.categories.filter((fc) => {
          if (!fc.id) return false;
          const orig = originalMap.get(fc.id);
          if (!orig) return false;
          return (
            orig.category.id !== fc.category_uuid ||
            (orig.subcategory?.id ?? '') !== (fc.subcategory_uuid ?? '')
          );
        });
        const categoryChangedIds = new Set(categoryChanged.map((fc) => fc.id));

        const toDelete = [
          ...template.categories.filter((tc) => !formIds.has(tc.id)),
          ...template.categories.filter((tc) => categoryChangedIds.has(tc.id)),
        ];
        const toUpdate = values.categories.filter(
          (fc) =>
            fc.id &&
            !categoryChangedIds.has(fc.id) &&
            originalMap.has(fc.id) &&
            originalMap.get(fc.id)!.allocated_amount !== fc.allocated_amount,
        );
        const toAdd = [
          ...values.categories.filter((fc) => !fc.id),
          ...categoryChanged,
        ];

        await Promise.all([
          ...toDelete.map((tc) =>
            apiFetch(`/budgets/templates/categories/${tc.id}`, { method: 'DELETE' }),
          ),
          ...toUpdate.map((fc) =>
            apiFetch(`/budgets/templates/categories/${fc.id}`, {
              method: 'PUT',
              body: JSON.stringify({ allocated_amount: fc.allocated_amount }),
            }),
          ),
          ...toAdd.map((fc) =>
            apiFetch(`/budgets/templates/${template.id}/categories/`, {
              method: 'POST',
              body: JSON.stringify(buildPayloadCategory(fc)),
            }),
          ),
        ]);

        qc.invalidateQueries({ queryKey: ['budget-templates'] });
        qc.invalidateQueries({ queryKey: ['budget-months'] });
      } else {
        await createTemplate.mutateAsync({
          template_name: values.template_name,
          is_default: values.is_default,
          categories: values.categories.map(buildPayloadCategory),
        });
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsPending(false);
    }
  }

  // Watch categories for subcategory envelope validation
  const watchedCategories = form.watch('categories');

  // Build envelope info: for each parent category, sum up subcategory allocations
  const envelopeInfo = new Map<string, { parentAmount: number; subTotal: number }>();
  for (const row of watchedCategories) {
    if (!row.subcategory_uuid) {
      // This is a parent allocation
      envelopeInfo.set(row.category_uuid, {
        parentAmount: parseFloat(row.allocated_amount) || 0,
        subTotal: 0,
      });
    }
  }
  for (const row of watchedCategories) {
    if (row.subcategory_uuid) {
      const info = envelopeInfo.get(row.category_uuid);
      if (info) {
        info.subTotal += parseFloat(row.allocated_amount) || 0;
      }
    }
  }

  // Track used category+subcategory combos to prevent duplicates
  const usedCombos = new Set(
    watchedCategories.map((c) => `${c.category_uuid}|${c.subcategory_uuid ?? ''}`).filter((s) => s !== '|'),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Template' : 'New Template'}</DialogTitle>
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
              name="template_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly Essentials" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default checkbox */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Set as default template (auto-assigned to new months)
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Category Allocations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Category Allocations</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ category_uuid: '', subcategory_uuid: '', allocated_amount: '' })}
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
                {fields.map((field, index) => {
                  const currentCatUuid = watchedCategories[index]?.category_uuid;
                  const currentSubUuid = watchedCategories[index]?.subcategory_uuid;
                  const children = currentCatUuid ? (childrenByParent.get(currentCatUuid) ?? []) : [];

                  // Show envelope warning for parent rows where subs exceed parent
                  const envelope = currentCatUuid && !currentSubUuid ? envelopeInfo.get(currentCatUuid) : null;
                  const overAllocated = envelope && envelope.subTotal > envelope.parentAmount;

                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-start gap-2">
                        {/* Category select */}
                        <FormField
                          control={form.control}
                          name={`categories.${index}.category_uuid`}
                          render={({ field: f }) => (
                            <FormItem className="flex-1">
                              <Select
                                onValueChange={(val) => {
                                  f.onChange(val);
                                  // Reset subcategory when parent changes
                                  form.setValue(`categories.${index}.subcategory_uuid`, '');
                                }}
                                value={f.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {parentCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Subcategory select (only if parent has children) */}
                        {children.length > 0 && (
                          <FormField
                            control={form.control}
                            name={`categories.${index}.subcategory_uuid`}
                            render={({ field: f }) => (
                              <FormItem className="flex-1">
                                <Select
                                  onValueChange={(val) => f.onChange(val === '__none__' ? '' : val)}
                                  value={f.value || '__none__'}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="(All)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="__none__">
                                      (Entire category)
                                    </SelectItem>
                                    {children.map((sub) => {
                                      const combo = `${currentCatUuid}|${sub.id}`;
                                      const isUsedElsewhere =
                                        usedCombos.has(combo) && f.value !== sub.id;
                                      return (
                                        <SelectItem
                                          key={sub.id}
                                          value={sub.id}
                                          disabled={isUsedElsewhere}
                                        >
                                          {sub.name}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}

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

                      {/* Envelope warning */}
                      {overAllocated && (
                        <p className="text-xs text-destructive pl-1">
                          Subcategories ({envelope.subTotal.toFixed(2)}) exceed parent ceiling ({envelope.parentAmount.toFixed(2)})
                        </p>
                      )}

                      {/* Envelope info for parent rows with subcategory allocations */}
                      {envelope && envelope.subTotal > 0 && !overAllocated && (
                        <p className="text-xs text-muted-foreground pl-1">
                          Subcategories: {envelope.subTotal.toFixed(2)} / {envelope.parentAmount.toFixed(2)}
                          {' '}({(envelope.parentAmount - envelope.subTotal).toFixed(2)} unallocated)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
