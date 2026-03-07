import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAmortization, useCreateAmortization, useDeleteAmortization } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import type { TransactionResponse } from '@/types/transactions';

interface CustomRow {
  month: string;
  amount: string;
}

const emptyRow = (): CustomRow => ({ month: '', amount: '' });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionResponse | null;
}

export function AmortizationDialog({ open, onOpenChange, transaction }: Props) {
  const { data: existing, isLoading: loadingExisting } = useAmortization(
    open && transaction ? transaction.id : null
  );
  const createAmortization = useCreateAmortization();
  const deleteAmortization = useDeleteAmortization();

  const [mode, setMode] = useState<'equal' | 'custom'>('equal');
  const [months, setMonths] = useState('');
  const [customRows, setCustomRows] = useState<CustomRow[]>([emptyRow(), emptyRow()]);

  const totalAmount = transaction ? Math.abs(parseFloat(transaction.amount)) : 0;
  const startMonth = transaction ? transaction.transaction_date.slice(0, 7) : '';
  const monthsNum = parseInt(months) || 0;
  const perMonth = monthsNum > 0 ? Math.round((totalAmount / monthsNum) * 100) / 100 : 0;

  const customSum = customRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const customRemaining = Math.round((totalAmount - customSum) * 100) / 100;
  const customBalanced = customRemaining === 0;

  const hasExisting = !!existing && !loadingExisting;

  // Populate form from existing schedule or reset
  useEffect(() => {
    if (!open) return;
    if (existing) {
      const amounts = existing.allocations.map((a) => a.amount);
      const allEqual = amounts.every((a) => a === amounts[0]);
      if (allEqual && existing.allocations.length > 0) {
        setMode('equal');
        setMonths(String(existing.num_months));
      } else {
        setMode('custom');
        setCustomRows(existing.allocations.map((a) => ({ month: a.month, amount: a.amount })));
      }
    } else {
      setMode('equal');
      setMonths('');
      setCustomRows([emptyRow(), emptyRow()]);
    }
  }, [open, existing]);

  function updateCustomRow(index: number, patch: Partial<CustomRow>) {
    setCustomRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeCustomRow(index: number) {
    setCustomRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!transaction) return;

    if (mode === 'equal') {
      createAmortization.mutate(
        { uuid: transaction.id, data: { start_month: startMonth, months: monthsNum } },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      const allocations = customRows
        .filter((r) => r.month && parseFloat(r.amount) > 0)
        .map((r) => ({ month: r.month, amount: r.amount }));
      createAmortization.mutate(
        { uuid: transaction.id, data: { allocations } },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  function handleRemove() {
    if (!transaction) return;
    deleteAmortization.mutate(transaction.id, {
      onSuccess: () => onOpenChange(false),
    });
  }

  const equalValid = startMonth && monthsNum >= 2;
  const customValid = customBalanced && customRows.length >= 2 &&
    customRows.every((r) => r.month && parseFloat(r.amount) > 0);
  const canSubmit = mode === 'equal' ? equalValid : customValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Amortize Transaction</DialogTitle>
          {transaction && (
            <p className="text-sm text-muted-foreground">
              {transaction.description} — {formatCurrency(transaction.amount)} total
              {transaction.category && (
                <> — {transaction.category.name}{transaction.subcategory ? ` / ${transaction.subcategory.name}` : ''}</>
              )}
            </p>
          )}
          {hasExisting && (
            <p className="text-sm text-green-600 font-medium">
              Active schedule: {existing.num_months} months
            </p>
          )}
        </DialogHeader>

        {loadingExisting ? (
          <p className="text-sm text-muted-foreground py-4">Loading schedule...</p>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'equal' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="equal">Equal Split</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="equal" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Number of Months</Label>
                <Input
                  type="number"
                  min="2"
                  className="w-32"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </div>
              {monthsNum >= 2 && (
                <p className="text-sm text-muted-foreground">
                  Starting {startMonth}: {formatCurrency(String(totalAmount))} / {monthsNum} = <span className="font-medium text-foreground">{formatCurrency(String(perMonth))}/mo</span>
                </p>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 pt-2">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {customRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="month"
                      className="flex-1"
                      value={row.month}
                      onChange={(e) => updateCustomRow(i, { month: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28"
                      placeholder="Amount"
                      value={row.amount}
                      onChange={(e) => updateCustomRow(i, { amount: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      disabled={customRows.length <= 2}
                      onClick={() => removeCustomRow(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomRows((prev) => [...prev, emptyRow()])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const emptyCount = customRows.filter((r) => !r.amount || parseFloat(r.amount) === 0).length;
                    if (emptyCount === 0 || customRemaining <= 0) return;
                    const perEmpty = Math.round((customRemaining / emptyCount) * 100) / 100;
                    setCustomRows((prev) =>
                      prev.map((r) =>
                        !r.amount || parseFloat(r.amount) === 0
                          ? { ...r, amount: String(perEmpty) }
                          : r
                      )
                    );
                  }}
                  disabled={customRemaining <= 0 || customRows.every((r) => r.amount && parseFloat(r.amount) > 0)}
                >
                  Fill Empty
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomRows((prev) => prev.map((r) => ({ ...r, amount: '' })))}
                >
                  Clear Amounts
                </Button>
              </div>
              <div className="text-sm font-medium">
                {customBalanced ? (
                  <span className="text-green-600">$0.00 — Balanced</span>
                ) : customRemaining < 0 ? (
                  <span className="text-red-500">
                    {formatCurrency(String(Math.abs(customRemaining)))} over-allocated
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {formatCurrency(String(customRemaining))} remaining
                  </span>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2">
          {hasExisting && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={deleteAmortization.isPending}
            >
              Remove Amortization
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createAmortization.isPending}
          >
            {createAmortization.isPending ? 'Saving...' : hasExisting ? 'Replace Schedule' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
