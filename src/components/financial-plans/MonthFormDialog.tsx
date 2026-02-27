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
import { useCreatePlanMonth, useUpdatePlanMonth } from '@/hooks/useFinancialPlans';
import type { FinancialPlanMonthResponse } from '@/types/financial-plans';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const schema = z.object({
  year: z
    .string()
    .min(1, 'Required')
    .regex(/^\d{4}$/, 'Enter a 4-digit year'),
  month: z.string().min(1, 'Select a month'),
  planned_income: z
    .string()
    .min(1, 'Required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
});

type FormValues = z.infer<typeof schema>;

interface MonthFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planUuid: string;
  /** When editing, the existing month */
  month?: FinancialPlanMonthResponse;
  /** When duplicating, the source month whose expenses should be copied */
  sourceMonth?: FinancialPlanMonthResponse;
}

export function MonthFormDialog({
  open,
  onOpenChange,
  planUuid,
  month,
  sourceMonth,
}: MonthFormDialogProps) {
  const isEdit = !!month;
  const isDuplicate = !!sourceMonth && !isEdit;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createMonth = useCreatePlanMonth();
  const updateMonth = useUpdatePlanMonth();
  const isPending = createMonth.isPending || updateMonth.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { year: '', month: '', planned_income: '' },
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      if (isEdit && month) {
        form.reset({
          year: month.year.toString(),
          month: month.month.toString(),
          planned_income: month.planned_income,
        });
      } else if (isDuplicate && sourceMonth) {
        form.reset({
          year: sourceMonth.year.toString(),
          month: sourceMonth.month.toString(),
          planned_income: sourceMonth.planned_income,
        });
      } else {
        const now = new Date();
        form.reset({
          year: now.getFullYear().toString(),
          month: '',
          planned_income: '',
        });
      }
    }
  }, [open, month, sourceMonth, isEdit, isDuplicate, form]);

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    const year = parseInt(values.year);
    const monthNum = parseInt(values.month);

    if (isEdit && month) {
      updateMonth.mutate(
        {
          monthUuid: month.id,
          data: { planned_income: values.planned_income },
          planUuid,
        },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    } else {
      const expenses = isDuplicate && sourceMonth
        ? sourceMonth.expenses
            .filter((e) => e.category_uuid !== null)
            .map((e) => ({
              description: e.description,
              amount: e.amount,
              expense_type: e.expense_type,
              category_uuid: e.category_uuid!,
            }))
        : undefined;

      createMonth.mutate(
        {
          planUuid,
          data: { year, month: monthNum, planned_income: values.planned_income, expenses },
        },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    }
  }

  const title = isEdit
    ? 'Edit Month'
    : isDuplicate
      ? `Duplicate ${MONTH_NAMES[sourceMonth!.month]} ${sourceMonth!.year}`
      : 'Add Month';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2026"
                        {...field}
                        disabled={isEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
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
            </div>
            <FormField
              control={form.control}
              name="planned_income"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Income</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isDuplicate && (
              <p className="text-xs text-muted-foreground">
                {sourceMonth!.expenses.length} expense{sourceMonth!.expenses.length !== 1 ? 's' : ''} will
                be copied from {MONTH_NAMES[sourceMonth!.month]} {sourceMonth!.year}.
              </p>
            )}
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : isDuplicate ? 'Duplicate' : 'Add Month'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
