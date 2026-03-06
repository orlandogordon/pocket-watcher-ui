import { useEffect } from 'react';
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
import { useBulkCreateMonths } from '@/hooks/useFinancialPlans';
import type { FinancialPlanMonthCreate } from '@/types/financial-plans';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const expenseTemplateSchema = z.object({
  description: z.string().min(1, 'Required'),
  amount: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  expense_type: z.enum(['recurring', 'one_time']),
  category_uuid: z.string().min(1, 'Select a category'),
});

const schema = z.object({
  start_year: z
    .string()
    .min(1, 'Required')
    .regex(/^\d{4}$/, '4-digit year'),
  start_month: z.string().min(1, 'Select a month'),
  count: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+$/, 'Must be a number')
    .refine((v) => parseInt(v) >= 1 && parseInt(v) <= 120, 'Between 1 and 120'),
  planned_income: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  expenses: z.array(expenseTemplateSchema),
});

type FormValues = z.infer<typeof schema>;

interface BulkMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planUuid: string;
}

export function BulkMonthDialog({ open, onOpenChange, planUuid }: BulkMonthDialogProps) {
  const bulkCreate = useBulkCreateMonths();

  const { data: categories } = useCategories();
  const categoryMap = buildCategoryMap(categories ?? []);
  const sortedCategories = [...(categories ?? [])].sort((a, b) => {
    const aLabel = getCategoryLabel(a.id, categoryMap);
    const bLabel = getCategoryLabel(b.id, categoryMap);
    return aLabel.localeCompare(bLabel);
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_year: new Date().getFullYear().toString(),
      start_month: '',
      count: '6',
      planned_income: '',
      expenses: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'expenses',
  });

  useEffect(() => {
    if (open) {
      bulkCreate.reset();
      form.reset({
        start_year: new Date().getFullYear().toString(),
        start_month: '',
        count: '6',
        planned_income: '',
        expenses: [],
      });
    }
  }, [open, form]);

  function onSubmit(values: FormValues) {
    const startYear = parseInt(values.start_year);
    const startMonth = parseInt(values.start_month);
    const count = parseInt(values.count);

    const expenseTemplates = values.expenses.map((e) => ({
      description: e.description,
      amount: e.amount,
      expense_type: e.expense_type as 'recurring' | 'one_time',
      category_uuid: e.category_uuid,
    }));

    const months: FinancialPlanMonthCreate[] = [];
    let y = startYear;
    let m = startMonth;
    for (let i = 0; i < count; i++) {
      months.push({
        year: y,
        month: m,
        planned_income: values.planned_income,
        expenses: expenseTemplates.length > 0 ? expenseTemplates : undefined,
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }

    bulkCreate.mutate(
      { planUuid, data: months },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const isPending = bulkCreate.isPending;

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add Multiple Months</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
            className="space-y-4"
          >
            {/* Starting month + count */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="start_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_NAMES.slice(1).map((name, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel># Months</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={120} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Income template */}
            <FormField
              control={form.control}
              name="planned_income"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Income (per month)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expense templates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Expense Template</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append({
                      description: '',
                      amount: '',
                      expense_type: 'recurring',
                      category_uuid: '',
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">
                  No expenses in template. Months will be created with income only.
                </p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2 rounded-md border p-3">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`expenses.${index}.description`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Description" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`expenses.${index}.amount`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Amount" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`expenses.${index}.expense_type`}
                          render={({ field: f }) => (
                            <FormItem>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="recurring">Recurring</SelectItem>
                                  <SelectItem value="one_time">One-time</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`expenses.${index}.category_uuid`}
                          render={({ field: f }) => (
                            <FormItem>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {sortedCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {getCategoryLabel(cat.id, categoryMap)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0 mt-0.5"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {bulkCreate.isError && (
              <p className="text-sm text-destructive">{bulkCreate.error.message}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Months'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
