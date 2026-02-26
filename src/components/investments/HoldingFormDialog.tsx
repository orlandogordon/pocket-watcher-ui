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
import { useCreateHolding, useUpdateHolding } from '@/hooks/useInvestments';
import type { InvestmentHoldingResponse } from '@/types/investments';

const schema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  average_cost_basis: z.string().min(1, 'Cost basis is required'),
  security_type: z.union([z.enum(['STOCK', 'OPTION']), z.literal('')]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountUuid: string;
  holding?: InvestmentHoldingResponse;
}

export function HoldingFormDialog({
  open,
  onOpenChange,
  accountUuid,
  holding,
}: HoldingFormDialogProps) {
  const isEdit = !!holding;
  const create = useCreateHolding();
  const update = useUpdateHolding();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { symbol: '', quantity: '', average_cost_basis: '', security_type: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        symbol: holding?.symbol ?? '',
        quantity: holding?.quantity ?? '',
        average_cost_basis: holding?.average_cost_basis ?? '',
        security_type: (holding?.security_type as 'STOCK' | 'OPTION') ?? '',
      });
    }
  }, [open, holding, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      account_uuid: accountUuid,
      symbol: values.symbol,
      quantity: values.quantity,
      average_cost_basis: values.average_cost_basis,
      security_type: values.security_type || undefined,
    };

    if (isEdit && holding) {
      update.mutate(
        { uuid: holding.id, data: payload },
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
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
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
              name="average_cost_basis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avg Cost Basis</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="security_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STOCK">Stock</SelectItem>
                      <SelectItem value="OPTION">Option</SelectItem>
                    </SelectContent>
                  </Select>
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
                {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Holding'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
