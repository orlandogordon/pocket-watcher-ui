import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { PreviewItem } from '@/types/uploads';
import { isInvestmentItem } from './PendingReviewTable';

const DUPLICATE_TYPE_LABELS: Record<string, string> = {
  database: 'DB Match',
  within_statement: 'In Statement',
  both: 'DB + Statement',
};

interface RejectedTableProps {
  items: PreviewItem[];
  onRestore: (tempId: string) => void;
  onBulkRestore: (tempIds: string[]) => void;
  isPending: boolean;
  pendingTempId: string | null;
}

function RejectedRow({
  item, onRestore, isPending, pendingTempId, selected, onToggleSelect, showInvestmentCols,
}: {
  item: PreviewItem;
  onRestore: (tempId: string) => void;
  isPending: boolean;
  pendingTempId: string | null;
  selected: boolean;
  onToggleSelect: (tempId: string) => void;
  showInvestmentCols: boolean;
}) {
  const isThisRowPending = pendingTempId === item.temp_id;
  const disabled = isPending || isThisRowPending;
  const edited = (item.edited_data ?? {}) as Record<string, unknown>;
  const pd = item.parsed_data as Record<string, string>;
  const displayAmount = String(edited.amount ?? pd.amount ?? edited.total_amount ?? pd.total_amount ?? '0');

  return (
    <TableRow className="opacity-60">
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(item.temp_id)} disabled={disabled} />
      </TableCell>
      <TableCell className="text-xs">{String(edited.transaction_date ?? pd.transaction_date)}</TableCell>
      <TableCell className="text-xs">{String(edited.description ?? pd.description)}</TableCell>
      <TableCell className="text-xs text-right">
        {formatCurrency(parseFloat(displayAmount))}
      </TableCell>
      {showInvestmentCols && (
        <>
          <TableCell className="text-xs">{String(edited.symbol ?? pd.symbol ?? '')}</TableCell>
          <TableCell className="text-xs text-right">{String(edited.quantity ?? pd.quantity ?? '')}</TableCell>
          <TableCell className="text-xs text-right">{String(edited.price_per_share ?? pd.price_per_share ?? '')}</TableCell>
        </>
      )}
      <TableCell className="text-xs">{String(edited.transaction_type ?? pd.transaction_type)}</TableCell>
      {/* Rejection reason */}
      <TableCell>
        {item.rejection_reason === 'unmapped_type' ? (
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
            Unmapped: {item.unmapped_type_value ?? 'unknown'}
          </Badge>
        ) : item.duplicate_info?.existing_transaction ? (
          <div>
            <div className="text-xs font-medium truncate max-w-32">{item.duplicate_info.existing_transaction.description}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(item.duplicate_info.existing_transaction.total_amount ?? item.duplicate_info.existing_transaction.amount ?? '0'))}
              {' · '}{item.duplicate_info.existing_transaction.transaction_date}
            </div>
            {item.duplicate_type && (
              <Badge variant="secondary" className="text-xs mt-0.5">
                {DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? item.duplicate_type}
              </Badge>
            )}
          </div>
        ) : item.duplicate_type ? (
          <Badge variant="secondary" className="text-xs">
            {DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? item.duplicate_type}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Rejected</span>
        )}
      </TableCell>
      {/* Actions */}
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => onRestore(item.temp_id)}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restore
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function RejectedTable({ items, onRestore, onBulkRestore, isPending, pendingTempId }: RejectedTableProps) {
  const showInvestmentCols = items.some((i) => isInvestmentItem(i));

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((tempId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.temp_id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.temp_id)));
  }

  function handleBulkRestore() {
    onBulkRestore([...selected]);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No rejected items.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="max-h-[calc(100vh-400px)] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  disabled={isPending || items.length === 0}
                />
              </TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28">Amount</TableHead>
              {showInvestmentCols && (
                <>
                  <TableHead className="w-20">Symbol</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-20">Price</TableHead>
                </>
              )}
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-48">Reason</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <RejectedRow
                key={item.temp_id}
                item={item}
                onRestore={onRestore}
                isPending={isPending}
                pendingTempId={pendingTempId}
                selected={selected.has(item.temp_id)}
                onToggleSelect={toggle}
                showInvestmentCols={showInvestmentCols}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
          <span className="text-xs text-muted-foreground mr-2">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkRestore} disabled={isPending}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Restore Selected
          </Button>
        </div>
      )}
    </div>
  );
}
