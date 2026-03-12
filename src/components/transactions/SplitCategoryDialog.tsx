import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { useUpdateSplits, useDeleteSplits } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import type { TransactionResponse } from '@/types/transactions';

interface AllocationRow {
  category_uuid: string;
  subcategory_uuid: string;
  amount: string;
}

const emptyRow = (): AllocationRow => ({
  category_uuid: '',
  subcategory_uuid: '',
  amount: '',
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionResponse | null;
}

export function SplitCategoryDialog({ open, onOpenChange, transaction }: Props) {
  const { data: categories } = useCategories();
  const updateSplits = useUpdateSplits();
  const deleteSplits = useDeleteSplits();

  const [rows, setRows] = useState<AllocationRow[]>([emptyRow(), emptyRow()]);

  const allCategories = categories ?? [];
  const parentCategories = allCategories.filter((c) => !c.parent_category_uuid);

  const totalAmount = transaction ? Math.abs(parseFloat(transaction.amount)) : 0;
  const allocatedSum = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const remaining = Math.round((totalAmount - allocatedSum) * 100) / 100;
  const isBalanced = remaining === 0;
  const hasExistingSplits = (transaction?.split_allocations?.length ?? 0) > 0;

  useEffect(() => {
    if (!open || !transaction) return;
    if (transaction.split_allocations?.length > 0) {
      setRows(
        transaction.split_allocations.map((a) => ({
          category_uuid: a.category_uuid,
          subcategory_uuid: a.subcategory_uuid ?? '',
          amount: a.amount,
        }))
      );
    } else {
      setRows([emptyRow(), emptyRow()]);
    }
  }, [open, transaction]);

  function updateRow(index: number, patch: Partial<AllocationRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function getSubcategories(parentUuid: string) {
    return allCategories.filter((c) => c.parent_category_uuid === parentUuid);
  }

  function handleSubmit() {
    if (!transaction || !isBalanced) return;
    const allocations = rows
      .filter((r) => r.category_uuid && parseFloat(r.amount) > 0)
      .map((r) => ({
        category_uuid: r.category_uuid,
        subcategory_uuid: r.subcategory_uuid || undefined,
        amount: r.amount,
      }));
    updateSplits.mutate(
      { uuid: transaction.id, allocations },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  function handleRemoveSplits() {
    if (!transaction) return;
    deleteSplits.mutate(transaction.id, {
      onSuccess: () => onOpenChange(false),
    });
  }

  // Detect duplicate (category, subcategory) pairs
  const pairKeys = rows
    .filter((r) => r.category_uuid)
    .map((r) => `${r.category_uuid}|${r.subcategory_uuid}`);
  const hasDuplicatePairs = new Set(pairKeys).size !== pairKeys.length;

  const canSubmit =
    isBalanced &&
    rows.length >= 2 &&
    !hasDuplicatePairs &&
    rows.every((r) => r.category_uuid && parseFloat(r.amount) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Split Categories</DialogTitle>
          {transaction && (
            <p className="text-sm text-muted-foreground">
              {transaction.description} — {formatCurrency(transaction.amount)} total
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <Select
                value={row.category_uuid || '_none_'}
                onValueChange={(v) =>
                  updateRow(i, {
                    category_uuid: v === '_none_' ? '' : v,
                    subcategory_uuid: '',
                  })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_" disabled>Category</SelectItem>
                  {parentCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={row.subcategory_uuid || '_none_'}
                onValueChange={(v) =>
                  updateRow(i, { subcategory_uuid: v === '_none_' ? '' : v })
                }
                disabled={!row.category_uuid || getSubcategories(row.category_uuid).length === 0}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {row.category_uuid &&
                    getSubcategories(row.category_uuid).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                step="0.01"
                min="0"
                className="w-28"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
              />

              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                disabled={rows.length <= 2}
                onClick={() => removeRow(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Allocation
        </Button>

        <div className="text-sm font-medium space-y-1">
          {isBalanced ? (
            <span className="text-green-600">$0.00 — Balanced</span>
          ) : (
            <span className={remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}>
              {formatCurrency(String(Math.abs(remaining)))} remaining
            </span>
          )}
          {hasDuplicatePairs && (
            <p className="text-red-500">Duplicate category/subcategory pairs are not allowed.</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasExistingSplits && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveSplits}
              disabled={deleteSplits.isPending}
            >
              Remove Splits
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || updateSplits.isPending}
          >
            {updateSplits.isPending ? 'Saving...' : 'Save Splits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
