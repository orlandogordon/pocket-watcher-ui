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
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts';
import type { AccountCreate } from '@/types/accounts';
import type { AccountResponse } from '@/types/accounts';

const ACCOUNT_TYPES = [
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'LOAN',
  'INVESTMENT',
  'OTHER',
] as const;

const INTEREST_RATE_TYPES = ['FIXED', 'VARIABLE'] as const;

const schema = z.object({
  account_name: z.string().min(1, 'Name is required'),
  account_type: z.enum(ACCOUNT_TYPES),
  institution_name: z.string().min(1, 'Institution is required'),
  account_number_last4: z.string().max(4).optional().or(z.literal('')),
  balance: z.string().optional(),
  interest_rate: z.string().optional(),
  interest_rate_type: z.union([z.enum(INTEREST_RATE_TYPES), z.literal('')]).optional(),
  minimum_payment: z.string().optional(),
  original_principal: z.string().optional(),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountResponse;
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  const isEdit = !!account;
  const create = useCreateAccount();
  const update = useUpdateAccount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_name: '',
      account_type: 'CHECKING',
      institution_name: '',
      account_number_last4: '',
      balance: '',
      interest_rate: '',
      interest_rate_type: undefined,
      minimum_payment: '',
      original_principal: '',
      comments: '',
    },
  });

  const accountType = form.watch('account_type');
  const isLoan = accountType === 'LOAN';

  useEffect(() => {
    if (open && account) {
      form.reset({
        account_name: account.account_name,
        account_type: account.account_type,
        institution_name: account.institution_name,
        account_number_last4: account.account_number_last4 ?? '',
        balance: account.balance ?? '',
        interest_rate: account.interest_rate
          ? String(parseFloat((parseFloat(account.interest_rate) * 100).toFixed(10)))
          : '',
        interest_rate_type: account.interest_rate_type ?? undefined,
        minimum_payment: account.minimum_payment ?? '',
        original_principal: account.original_principal ?? '',
        comments: account.comments ?? '',
      });
    } else if (open && !account) {
      form.reset({
        account_name: '',
        account_type: 'CHECKING',
        institution_name: '',
        account_number_last4: '',
        balance: '',
        interest_rate: '',
        interest_rate_type: undefined,
        minimum_payment: '',
        original_principal: '',
        comments: '',
      });
    }
  }, [open, account, form]);

  function onSubmit(values: FormValues) {
const payload: AccountCreate = {
      ...values,
      account_number_last4: values.account_number_last4 || undefined,
      balance: values.balance || undefined,
      interest_rate: isLoan && values.interest_rate
        ? String(parseFloat(values.interest_rate) / 100)
        : undefined,
      interest_rate_type: isLoan ? (values.interest_rate_type || undefined) : undefined,
      minimum_payment: isLoan ? values.minimum_payment || undefined : undefined,
      original_principal: isLoan ? values.original_principal || undefined : undefined,
      comments: values.comments || undefined,
    };

    if (isEdit && account) {
      update.mutate({ uuid: account.uuid, data: payload }, {
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
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            <FormField
              control={form.control}
              name="account_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Checking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace('_', ' ')}
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
              name="institution_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution</FormLabel>
                  <FormControl>
                    <Input placeholder="TD Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_number_last4"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last 4 Digits</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" maxLength={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isLoan && (
              <>
                <FormField
                  control={form.control}
                  name="original_principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="25000.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interest_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input placeholder="6.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interest_rate_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTEREST_RATE_TYPES.map((t) => (
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
                  name="minimum_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Payment</FormLabel>
                      <FormControl>
                        <Input placeholder="350.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
