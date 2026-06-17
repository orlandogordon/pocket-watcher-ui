import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { GroupMode, ReviewGroup } from './groupTransactions';

const GROUP_ROW_HEIGHT = 72;

interface GroupListProps {
  groups: ReviewGroup[];
  mode: GroupMode;
  onModeChange: (mode: GroupMode) => void;
  activeKey: string | null;
  onSelect: (key: string) => void;
  remaining: number;
}

function dateRange(g: ReviewGroup): string {
  if (!g.minDate) return '';
  if (g.minDate === g.maxDate) return formatDate(g.minDate);
  return `${formatDate(g.minDate)} – ${formatDate(g.maxDate!)}`;
}

export function GroupList({
  groups,
  mode,
  onModeChange,
  activeKey,
  onSelect,
  remaining,
}: GroupListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.label.toLowerCase().includes(q));
  }, [groups, search]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => GROUP_ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Groups</h2>
        <span className="text-xs text-muted-foreground">{remaining} to review</span>
      </div>

      <Tabs value={mode} onValueChange={(v) => onModeChange(v as GroupMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="merchant" className="flex-1 text-xs">
            Merchant
          </TabsTrigger>
          <TabsTrigger value="description" className="flex-1 text-xs">
            Description
          </TabsTrigger>
          <TabsTrigger value="amount" className="flex-1 text-xs">
            Amount
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        className="h-8"
        placeholder="Filter groups…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No groups.</p>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vr) => {
              const g = filtered[vr.index];
              const active = g.key === activeKey;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => onSelect(g.key)}
                  className={cn(
                    'absolute left-0 top-0 flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-foreground',
                    active
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-transparent hover:bg-muted/50',
                  )}
                  style={{
                    height: `${GROUP_ROW_HEIGHT - 6}px`,
                    transform: `translateY(${vr.start}px)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium" title={g.label}>
                      {g.label}
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {g.count}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{dateRange(g)}</span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(g.total)}</span>
                  </div>
                  {(g.accounts.size > 1 ||
                    g.distinctTypes.size > 1 ||
                    g.hasCategoryConflict) && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {[
                        g.accounts.size > 1 && 'accounts',
                        g.distinctTypes.size > 1 && 'types',
                        g.hasCategoryConflict && 'categories',
                      ]
                        .filter(Boolean)
                        .join(', ')}{' '}
                      differ
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
