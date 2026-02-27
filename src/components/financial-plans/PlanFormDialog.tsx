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
import { useCreateFinancialPlan, useUpdateFinancialPlan } from '@/hooks/useFinancialPlans';
import type { FinancialPlanResponse } from '@/types/financial-plans';

const schema = z.object({
  plan_name: z.string().min(1, 'Name is required'),
});

type FormValues = z.infer<typeof schema>;

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: FinancialPlanResponse;
}

export function PlanFormDialog({ open, onOpenChange, plan }: PlanFormDialogProps) {
  const isEdit = !!plan;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createPlan = useCreateFinancialPlan();
  const updatePlan = useUpdateFinancialPlan();
  const isPending = createPlan.isPending || updatePlan.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan_name: '' },
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({ plan_name: plan?.plan_name ?? '' });
    }
  }, [open, plan, form]);

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (isEdit && plan) {
      updatePlan.mutate(
        { uuid: plan.id, data: { plan_name: values.plan_name } },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    } else {
      // Send placeholder dates — they'll be auto-synced when months are added
      const now = new Date();
      const placeholder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      createPlan.mutate(
        {
          plan_name: values.plan_name,
          start_date: placeholder,
          end_date: placeholder,
        },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err) => setSubmitError(err.message),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Plan' : 'New Plan'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2026 Budget" {...field} />
                  </FormControl>
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
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
