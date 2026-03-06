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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import type { TransactionCreate, TransactionResponse } from '@/types/transactions';

const TRANSACTION_TYPES = [
  'PURCHASE',
  'WITHDRAWAL',
  'FEE',
  'DEPOSIT',
  'CREDIT',
  'INTEREST',
  'TRANSFER',
] as const;

const schema = z.object({
  account_uuid: z.string().min(1, 'Account is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  amount: z.string().min(1, 'Amount is required'),
  transaction_type: z.union([z.enum(TRANSACTION_TYPES), z.literal('')]),
  description: z.string().min(1, 'Description is required'),
  merchant_name: z.string().optional(),
  category_uuid: z.string().optional().or(z.literal('')),
  subcategory_uuid: z.string().optional().or(z.literal('')),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionResponse;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionFormDialogProps) {
  const isEdit = !!transaction;
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const allCategories = categories ?? [];
  const parentCategories = allCategories.filter((c) => !c.parent_category_uuid);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_uuid: '',
      transaction_date: '',
      amount: '',
      transaction_type: '',
      description: '',
      merchant_name: '',
      category_uuid: '',
      subcategory_uuid: '',
      comments: '',
    },
  });

  const selectedCategoryId = form.watch('category_uuid');
  const subcategories = allCategories.filter(
    (c) => c.parent_category_uuid === selectedCategoryId
  );

  useEffect(() => {
    if (open && transaction) {
      form.reset({
        account_uuid: transaction.account_uuid,
        transaction_date: transaction.transaction_date,
        amount: transaction.amount,
        transaction_type: transaction.transaction_type ?? '',
        description: transaction.description,
        merchant_name: transaction.merchant_name ?? '',
        category_uuid: transaction.category?.id ?? '',
        subcategory_uuid: transaction.subcategory?.id ?? '',
        comments: transaction.comments ?? '',
      });
    } else if (open && !transaction) {
      form.reset({
        account_uuid: '',
        transaction_date: '',
        amount: '',
        transaction_type: '',
        description: '',
        merchant_name: '',
        category_uuid: '',
        subcategory_uuid: '',
        comments: '',
      });
    }
  }, [open, transaction, form]);


  function onSubmit(values: FormValues) {
    const payload: TransactionCreate = {
      account_uuid: values.account_uuid,
      transaction_date: values.transaction_date,
      amount: values.amount,
      transaction_type: values.transaction_type || 'PURCHASE',
      description: values.description,
      merchant_name: values.merchant_name || undefined,
      category_uuid: values.category_uuid || null,
      subcategory_uuid: values.subcategory_uuid || null,
      comments: values.comments || undefined,
    };

    if (isEdit && transaction) {
      update.mutate({ uuid: transaction.id, data: payload }, {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
            className="space-y-4"
          >
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              <FormField
                control={form.control}
                name="account_uuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(accounts ?? []).map((a) => (
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="-50.00 or 1200.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Coffee shop" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="merchant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant</FormLabel>
                    <FormControl>
                      <Input placeholder="Starbucks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_uuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v === '_none_' ? '' : v);
                        form.setValue('subcategory_uuid', '');
                      }}
                      value={field.value || '_none_'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none_">None</SelectItem>
                        {parentCategories.map((c) => (
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

              <FormField
                control={form.control}
                name="subcategory_uuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '_none_' ? '' : v)}
                      value={field.value || '_none_'}
                      disabled={!selectedCategoryId || subcategories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none_">None</SelectItem>
                        {subcategories.map((c) => (
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

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
