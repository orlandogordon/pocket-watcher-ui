import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  ArrowRight,
  Inbox,
  Loader2,
  Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAttentionAction, useAttentionItems } from '@/hooks/useDataHealth';
import { useBulkUpdateTransactions, useTransaction } from '@/hooks/useTransactions';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { ConfidenceChip } from '@/components/inbox/ConfidenceChip';
import { NeedsReviewWorkspace } from '@/components/inbox/NeedsReviewWorkspace';
import {
  getAccountName,
  getAmount,
  getCategory,
  getComments,
  getDate,
  getDescription,
  getMerchant,
  getTypeLabel,
} from '@/components/inbox/inboxItem';
import type {
  AttentionAction,
  AttentionItem,
  AttentionKind,
  AttentionSeverity,
} from '@/types/data-health';
import { SEVERITY_RANK } from '@/types/data-health';

type TabValue = AttentionKind | 'all';

const KIND_LABEL: Record<AttentionKind, string> = {
  needs_review: 'Needs review',
  transfer_pair: 'Transfer pair',
  transfer_orphan: 'Orphan',
  snapshot_review: 'Snapshot',
};

const SEVERITY_BADGE: Record<AttentionSeverity, string> = {
  action_required: 'border-red-300 bg-red-50 text-red-700',
  suggested: 'border-amber-300 bg-amber-50 text-amber-700',
  informational: 'border-slate-200 bg-slate-50 text-slate-600',
};

const SEVERITY_LABEL: Record<AttentionSeverity, string> = {
  action_required: 'Action',
  suggested: 'Suggested',
  informational: 'FYI',
};

function ActionButton({ item, action }: { item: AttentionItem; action: AttentionAction }) {
  const mut = useAttentionAction();
  const variant = action.method === 'DELETE' ? 'outline' : 'default';

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <Button
        size="sm"
        variant={variant}
        disabled={mut.isPending}
        onClick={() => mut.mutate({ action, kind: item.kind, itemId: item.id })}
      >
        {mut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
        {action.label}
      </Button>
      {mut.isError && (
        <button
          type="button"
          className="text-[10px] text-destructive hover:underline"
          onClick={() => mut.reset()}
          title={mut.error?.message}
        >
          Failed — dismiss
        </button>
      )}
    </div>
  );
}

function BulkBar({
  count,
  pending,
  onMarkReviewed,
  onClear,
}: {
  count: number;
  pending: boolean;
  onMarkReviewed: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-amber-50/60 px-3 py-2">
      <p className="text-sm">
        <span className="font-medium">{count}</span> selected
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClear} disabled={pending}>
          Clear
        </Button>
        <Button size="sm" onClick={onMarkReviewed} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Mark {count} reviewed
        </Button>
      </div>
    </div>
  );
}

const ROW_HEIGHT = 56;

export function InboxPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAttentionItems();
  const bulkReview = useBulkUpdateTransactions();

  const [tab, setTab] = useState<TabValue>('all');
  // Needs-review has two presentations: the grouped bulk-review workspace
  // (default — clears a large backlog fast) and the original flat table.
  const [needsReviewView, setNeedsReviewView] = useState<'grouped' | 'list'>('grouped');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit-dialog flow: clicking the row's edit affordance kicks off a fetch
  // for the underlying transaction; once it lands the dialog opens.
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { data: editTx } = useTransaction(editTxId);
  useEffect(() => {
    if (editTx) setFormOpen(true);
  }, [editTx]);

  // Reset selection when switching tabs (a needs_review selection is
  // meaningless under the transfer_pair tab).
  useEffect(() => {
    setSelected(new Set());
  }, [tab]);

  const counts = useMemo(() => {
    const c: Record<AttentionKind, number> = {
      needs_review: 0,
      transfer_pair: 0,
      transfer_orphan: 0,
      snapshot_review: 0,
    };
    for (const item of data ?? []) c[item.kind]++;
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as AttentionItem[];
    const arr = tab === 'all' ? data : data.filter((i) => i.kind === tab);
    return [...arr].sort((a, b) => {
      const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sev !== 0) return sev;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [data, tab]);

  // Bulk-select scope: only Needs Review carries volume and a clean batch
  // action (DELETE the system tag). Other kinds have per-item actions only.
  const bulkEligible = tab === 'needs_review';
  // Category/Comments only exist on regular TransactionDB rows
  // (needs_review items today). Hide the columns on tabs where the
  // details payload never carries them so we don't waste row width.
  const showCategoryComments = tab === 'needs_review' || tab === 'all';

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!bulkEligible) return;
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id)),
    );
  }

  function bulkMarkReviewed() {
    if (!bulkEligible || selected.size === 0) return;
    // One atomic call strips the "Needs Review" system tag from every selected
    // row (clear_review) — replaces the old per-item DELETE fan-out.
    const uuids = filtered
      .filter((i) => selected.has(i.id))
      .map((i) => i.subject.primary_uuid);
    bulkReview.mutate(
      { uuids, patch: {}, clear_review: true },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  function openRecord(item: AttentionItem) {
    const sub = item.subject;
    if (sub.type === 'transaction' || sub.type === 'transfer_pair') {
      // Pair's primary_uuid is the out-side transaction UUID — same dialog.
      setEditTxId(sub.primary_uuid);
      return;
    }
    if (sub.type === 'snapshot') {
      navigate(`/net-worth?snapshot=${sub.primary_uuid}`);
      return;
    }
    if (sub.type === 'investment_transaction') {
      navigate(`/investments`);
    }
  }

  function closeForm(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTxId(null);
  }

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const allSelected = bulkEligible && filtered.length > 0 && selected.size === filtered.length;
  const someSelected = bulkEligible && selected.size > 0 && !allSelected;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Attention inbox</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} total` : ''}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All ({data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="needs_review">
            Needs review ({counts.needs_review})
          </TabsTrigger>
          <TabsTrigger value="transfer_pair">
            Transfer pair ({counts.transfer_pair})
          </TabsTrigger>
          <TabsTrigger value="transfer_orphan">
            Orphan ({counts.transfer_orphan})
          </TabsTrigger>
          <TabsTrigger value="snapshot_review">
            Snapshot ({counts.snapshot_review})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {bulkEligible && (
        <div className="flex items-center gap-2">
          <Tabs
            value={needsReviewView}
            onValueChange={(v) => setNeedsReviewView(v as 'grouped' | 'list')}
          >
            <TabsList className="h-8">
              <TabsTrigger value="grouped" className="text-xs">
                Grouped
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {bulkEligible && needsReviewView === 'list' && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          pending={bulkReview.isPending}
          onMarkReviewed={bulkMarkReviewed}
          onClear={() => setSelected(new Set())}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          Failed to load inbox{error?.message ? `: ${error.message}` : ''}.
        </p>
      ) : bulkEligible && needsReviewView === 'grouped' ? (
        <NeedsReviewWorkspace items={filtered} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nothing in this view.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-md border bg-background">
         <div className={cn('h-full flex flex-col', showCategoryComments && 'min-w-[1400px]')}>
          {/* Table header */}
          <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {bulkEligible && (
              <div className="w-6 flex items-center">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </div>
            )}
            <div className="w-16">Severity</div>
            {tab === 'all' && <div className="w-28">Kind</div>}
            <div className="w-24">Date</div>
            <div className="flex-1 min-w-[180px] truncate">Description</div>
            <div className="w-36">Merchant</div>
            <div className="w-32">Account</div>
            {showCategoryComments && <div className="w-40">Category</div>}
            <div className="w-24">Type</div>
            <div className="w-28 text-right">Amount</div>
            {showCategoryComments && <div className="w-32">Comments</div>}
            <div className="w-[200px] text-right pr-1">Actions</div>
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
                const item = filtered[vr.index];
                const isSelected = selected.has(item.id);
                const date = getDate(item);
                const desc = getDescription(item);
                const amount = getAmount(item);
                const typeLabel = getTypeLabel(item);
                const merchant = getMerchant(item);
                const acctName = getAccountName(item);
                const category = getCategory(item);
                const comments = getComments(item);

                return (
                  <div
                    key={item.id}
                    data-index={vr.index}
                    className={cn(
                      'flex items-center gap-3 border-b px-3 py-2 text-sm',
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
                    {bulkEligible && (
                      <div className="w-6 flex items-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(item.id)}
                          aria-label={`Select ${item.id}`}
                        />
                      </div>
                    )}
                    <div className="w-16">
                      <Badge variant="outline" className={cn('text-[10px]', SEVERITY_BADGE[item.severity])}>
                        {SEVERITY_LABEL[item.severity]}
                      </Badge>
                    </div>
                    {tab === 'all' && (
                      <div className="w-28 flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {KIND_LABEL[item.kind]}
                        </Badge>
                      </div>
                    )}
                    <div className="w-24 text-muted-foreground text-xs whitespace-nowrap">
                      {date ? formatDate(date) : '—'}
                    </div>
                    <div className="flex-1 min-w-[180px] truncate" title={desc}>
                      {desc}
                      {item.confidence && (
                        <span className="ml-2 inline-block align-middle">
                          <ConfidenceChip confidence={item.confidence} />
                        </span>
                      )}
                    </div>
                    <div
                      className="w-36 truncate text-xs text-muted-foreground"
                      title={merchant ?? undefined}
                    >
                      {merchant ?? '—'}
                    </div>
                    <div
                      className="w-32 truncate text-xs text-muted-foreground"
                      title={acctName ?? undefined}
                    >
                      {acctName ?? '—'}
                    </div>
                    {showCategoryComments && (
                      <div
                        className="w-40 truncate text-xs text-muted-foreground"
                        title={category ?? undefined}
                      >
                        {category ?? '—'}
                      </div>
                    )}
                    <div className="w-24 text-xs">
                      {typeLabel ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {typeLabel}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="w-28 text-right font-medium tabular-nums">
                      {amount ? formatCurrency(amount) : '—'}
                    </div>
                    {showCategoryComments && (
                      <div
                        className="w-32 truncate text-xs text-muted-foreground"
                        title={comments ?? undefined}
                      >
                        {comments ?? '—'}
                      </div>
                    )}
                    <div className="w-[200px] flex items-center justify-end gap-1.5 pr-1">
                      {item.actions.length > 0 ? (
                        item.actions.map((action, idx) => (
                          <ActionButton key={`${item.id}-act-${idx}`} item={item} action={action} />
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">no action</span>
                      )}
                      {(item.subject.type === 'transaction' ||
                        item.subject.type === 'transfer_pair') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          title="Open transaction"
                          onClick={() => openRecord(item)}
                        >
                          {editTxId === item.subject.primary_uuid && !formOpen ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {item.subject.type === 'snapshot' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          title="View on net-worth chart"
                          onClick={() => openRecord(item)}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
         </div>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={closeForm}
        transaction={editTx}
      />
    </div>
  );
}
