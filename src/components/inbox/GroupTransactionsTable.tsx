import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { AttentionItem } from '@/types/data-health';
import {
  getAccountName,
  getAmount,
  getCategory,
  getDate,
  getDescription,
} from './inboxItem';

const ROW_HEIGHT = 44;

interface GroupTransactionsTableProps {
  items: AttentionItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (item: AttentionItem) => void;
  editingUuid: string | null;
}

export function GroupTransactionsTable({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onEdit,
  editingUuid,
}: GroupTransactionsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
      <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex w-6 items-center">
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={onToggleAll}
            aria-label="Select all in group"
          />
        </div>
        <div className="w-24">Date</div>
        <div className="min-w-[160px] flex-1">Description</div>
        <div className="w-32">Account</div>
        <div className="w-40">Category</div>
        <div className="w-24 text-right">Amount</div>
        <div className="w-8" />
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const item = items[vr.index];
            const isSelected = selectedIds.has(item.id);
            const uuid = item.subject.primary_uuid;
            const date = getDate(item);
            const desc = getDescription(item);
            const acct = getAccountName(item);
            const category = getCategory(item);
            const amount = getAmount(item);

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 border-b px-3 text-sm',
                  isSelected && 'bg-amber-50/40',
                )}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${vr.start}px)`,
                }}
              >
                <div className="flex w-6 items-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(item.id)}
                    aria-label={`Select ${desc}`}
                  />
                </div>
                <div className="w-24 whitespace-nowrap text-xs text-muted-foreground">
                  {date ? formatDate(date) : '—'}
                </div>
                <div className="min-w-[160px] flex-1 truncate" title={desc}>
                  {desc}
                </div>
                <div
                  className="w-32 truncate text-xs text-muted-foreground"
                  title={acct ?? undefined}
                >
                  {acct ?? '—'}
                </div>
                <div
                  className="w-40 truncate text-xs text-muted-foreground"
                  title={category ?? undefined}
                >
                  {category ?? '—'}
                </div>
                <div className="w-24 text-right font-medium tabular-nums">
                  {amount ? formatCurrency(amount) : '—'}
                </div>
                <div className="flex w-8 items-center justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    title="Edit this transaction"
                    onClick={() => onEdit(item)}
                  >
                    {editingUuid === uuid ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
