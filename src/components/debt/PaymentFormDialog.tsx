import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateDebtPayment } from '@/hooks/useDebt';
import { useAccounts } from '@/hooks/useAccounts';

const schema = z.object({
  payment_amount: z.string().min(1, 'Amount is required'),
  payment_date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  payment_source_account_uuid: z.string().optional(),
  principal_amount: z.string().optional(),
  interest_amount: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanAccountUuid: string;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  loanAccountUuid,
}: PaymentFormDialogProps) {
  const create = useCreateDebtPayment();
  const { data: accounts } = useAccounts();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sourceAccounts = (accounts ?? []).filter(
    (a) => a.account_type !== 'LOAN' && a.account_type !== 'INVESTMENT',
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      description: '',
      payment_source_account_uuid: '',
      principal_amount: '',
      interest_amount: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        payment_amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        description: '',
        payment_source_account_uuid: '',
        principal_amount: '',
        interest_amount: '',
      });
      setShowAdvanced(false);
    }
  }, [open, form]);

  function onSubmit(values: FormValues) {
    create.mutate(
      {
        loan_account_uuid: loanAccountUuid,
        payment_amount: values.payment_amount,
        payment_date: values.payment_date,
        payment_source_account_uuid: values.payment_source_account_uuid || undefined,
        principal_amount: values.principal_amount || undefined,
        interest_amount: values.interest_amount || undefined,
        description: values.description || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="payment_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_source_account_uuid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Account</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sourceAccounts.map((a) => (
                        <SelectItem key={a.uuid} value={a.uuid}>
                          {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced (principal/interest split)
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-2 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground">
                  Leave blank to let the backend auto-calculate the split.
                </p>
                <FormField
                  control={form.control}
                  name="principal_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Principal Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Auto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interest_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Auto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {create.error && (
              <p className="text-sm text-destructive">{create.error.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={create.isPending} onClick={form.handleSubmit(onSubmit)}>
                {create.isPending ? 'Saving...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
