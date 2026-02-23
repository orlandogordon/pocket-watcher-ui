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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCopyBudget } from '@/hooks/useBudgets';
import type { BudgetResponse } from '@/types/budgets';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

type FormValues = z.infer<typeof schema>;

interface CopyBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetResponse | null;
}

export function CopyBudgetDialog({ open, onOpenChange, budget }: CopyBudgetDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const copyBudget = useCopyBudget();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', start_date: '', end_date: '' },
  });

  useEffect(() => {
    if (open && budget) {
      setSubmitError(null);
      form.reset({
        name: `${budget.budget_name} (Copy)`,
        start_date: '',
        end_date: '',
      });
    }
  }, [open, budget, form]);

  function onSubmit(values: FormValues) {
    if (!budget) return;
    setSubmitError(null);
    copyBudget.mutate(
      {
        uuid: budget.id,
        name: values.name,
        startDate: values.start_date,
        endDate: values.end_date,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setSubmitError(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Copy Budget</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Budget Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={copyBudget.isPending}
                onClick={form.handleSubmit(onSubmit)}
              >
                {copyBudget.isPending ? 'Copying...' : 'Copy Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
