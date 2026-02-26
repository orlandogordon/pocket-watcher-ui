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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  useCreateInvestmentTransaction,
  useUpdateInvestmentTransaction,
} from '@/hooks/useInvestments';
import type {
  InvestmentTransactionResponse,
  InvestmentTransactionType,
} from '@/types/investments';

const TRANSACTION_TYPES: InvestmentTransactionType[] = [
  'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TRANSFER', 'REINVESTMENT', 'OTHER',
];

const schema = z.object({
  transaction_type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TRANSFER', 'REINVESTMENT', 'OTHER']),
  symbol: z.string().optional(),
  quantity: z.string().optional(),
  price_per_share: z.string().optional(),
  total_amount: z.string().min(1, 'Total amount is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InvestmentTransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountUuid: string;
  transaction?: InvestmentTransactionResponse;
}

export function InvestmentTransactionFormDialog({
  open,
  onOpenChange,
  accountUuid,
  transaction,
}: InvestmentTransactionFormDialogProps) {
  const isEdit = !!transaction;
  const create = useCreateInvestmentTransaction();
  const update = useUpdateInvestmentTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transaction_type: 'BUY',
      symbol: '',
      quantity: '',
      price_per_share: '',
      total_amount: '',
      transaction_date: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        transaction_type: transaction?.transaction_type ?? 'BUY',
        symbol: transaction?.symbol ?? '',
        quantity: transaction?.quantity ?? '',
        price_per_share: transaction?.price_per_share ?? '',
        total_amount: transaction?.total_amount ?? '',
        transaction_date: transaction?.transaction_date?.slice(0, 10) ?? '',
        description: transaction?.description ?? '',
      });
    }
  }, [open, transaction, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      account_uuid: accountUuid,
      transaction_type: values.transaction_type,
      symbol: values.symbol || undefined,
      quantity: values.quantity || undefined,
      price_per_share: values.price_per_share || undefined,
      total_amount: values.total_amount,
      transaction_date: values.transaction_date,
      description: values.description || undefined,
    };

    if (isEdit && transaction) {
      update.mutate(
        { uuid: transaction.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  const isPending = create.isPending || update.isPending;
  const error = create.error || update.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Transaction' : 'Add Investment Transaction'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AAPL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_share"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price/Share</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="total_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
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
                    <Input placeholder="Optional description" {...field} />
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
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
