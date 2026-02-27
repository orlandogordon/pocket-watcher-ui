import { useEffect, useState } from 'react';
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
import { useCreatePlanExpense, useUpdatePlanExpense } from '@/hooks/useFinancialPlans';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import type { FinancialPlanExpenseResponse } from '@/types/financial-plans';

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  expense_type: z.enum(['recurring', 'one_time']),
  category_uuid: z.string().min(1, 'Select a category'),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planUuid: string;
  monthUuid: string;
  expense?: FinancialPlanExpenseResponse;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  planUuid,
  monthUuid,
  expense,
}: ExpenseFormDialogProps) {
  const isEdit = !!expense;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createExpense = useCreatePlanExpense();
  const updateExpense = useUpdatePlanExpense();
  const isPending = createExpense.isPending || updateExpense.isPending;

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
      description: '',
      amount: '',
      expense_type: 'recurring',
      category_uuid: '',
    },
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({
        description: expense?.description ?? '',
        amount: expense?.amount ?? '',
        expense_type: expense?.expense_type ?? 'recurring',
        category_uuid: expense?.category_uuid ?? '',
      });
    }
  }, [open, expense, form]);

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload = {
      description: values.description,
      amount: values.amount,
      expense_type: values.expense_type as 'recurring' | 'one_time',
      category_uuid: values.category_uuid,
    };

    if (isEdit && expense) {
      updateExpense.mutate(
        { expenseUuid: expense.id, data: payload, planUuid },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    } else {
      createExpense.mutate(
        { monthUuid, data: payload, planUuid },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expense_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>
            <FormField
              control={form.control}
              name="category_uuid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
