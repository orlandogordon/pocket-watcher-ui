import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { useBulkUpdateTransactions, useTransaction } from '@/hooks/useTransactions';
import type { AttentionItem } from '@/types/data-health';
import { groupNeedsReview, type GroupMode } from './groupTransactions';
import { GroupList } from './GroupList';
import { GroupTransactionsTable } from './GroupTransactionsTable';
import { BulkEditPanel, type BulkApplyPayload } from './BulkEditPanel';

interface NeedsReviewWorkspaceProps {
  items: AttentionItem[];
}

export function NeedsReviewWorkspace({ items }: NeedsReviewWorkspaceProps) {
  const bulk = useBulkUpdateTransactions();

  const [mode, setMode] = useState<GroupMode>('merchant');
  // The user's explicit group pick. May be null (nothing picked yet) or stale
  // after the backlog shrinks — `activeGroup` reconciles it during render so we
  // always land on a valid group (auto-advancing to the biggest remaining one).
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupNeedsReview(items, mode), [items, mode]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return (pickedKey && groups.find((g) => g.key === pickedKey)) || groups[0];
  }, [groups, pickedKey]);
  const activeKey = activeGroup?.key ?? null;

  // Reset the selection to "all rows" whenever the active group changes — the
  // render-phase compare keeps this in sync without an effect (React's blessed
  // adjust-state-during-render pattern).
  const [selKey, setSelKey] = useState<string | null>(null);
  if (selKey !== activeKey) {
    setSelKey(activeKey);
    setSelectedIds(new Set(activeGroup?.items.map((i) => i.id)));
  }

  // Effective selection: intersect the raw set with the group's current rows so
  // a partial apply (which removes applied rows from `items`) can't leave stale
  // ids inflating the count.
  const effectiveSelected = useMemo(() => {
    if (!activeGroup) return new Set<string>();
    const ids = new Set(activeGroup.items.map((i) => i.id));
    return new Set([...selectedIds].filter((id) => ids.has(id)));
  }, [activeGroup, selectedIds]);

  // Per-row edit: fetch the transaction, then open the shared form dialog. The
  // dialog is open exactly while the fetched row is present; closing clears the
  // id (and disables the query), so `editTx` falls back to undefined.
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const { data: editTx } = useTransaction(editTxId);
  const formOpen = editTx != null;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!activeGroup) return;
    setSelectedIds(
      effectiveSelected.size === activeGroup.items.length
        ? new Set()
        : new Set(activeGroup.items.map((i) => i.id)),
    );
  }

  function selectedUuids(): string[] {
    if (!activeGroup) return [];
    return activeGroup.items
      .filter((i) => effectiveSelected.has(i.id))
      .map((i) => i.subject.primary_uuid);
  }

  function apply(payload: BulkApplyPayload) {
    const uuids = selectedUuids();
    if (uuids.length === 0) return;
    bulk.mutate({
      uuids,
      patch: payload.patch,
      add_tag_uuids: payload.addTagUuids,
      remove_tag_uuids: payload.removeTagUuids,
      clear_review: payload.clearReview,
    });
  }

  function markReviewed() {
    const uuids = selectedUuids();
    if (uuids.length === 0) return;
    bulk.mutate({ uuids, patch: {}, clear_review: true });
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p>Nothing left to review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <GroupList
        groups={groups}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setPickedKey(null);
        }}
        activeKey={activeKey}
        onSelect={setPickedKey}
        remaining={items.length}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {activeGroup ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{activeGroup.label}</h2>
                <span className="text-sm text-muted-foreground">
                  {activeGroup.count} transactions
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="text-xs"
              >
                {effectiveSelected.size === activeGroup.items.length
                  ? 'Clear selection'
                  : 'Select all'}
              </Button>
            </div>

            <GroupTransactionsTable
              items={activeGroup.items}
              selectedIds={effectiveSelected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onEdit={(item) => setEditTxId(item.subject.primary_uuid)}
              editingUuid={!formOpen ? editTxId : null}
            />

            <BulkEditPanel
              key={activeKey ?? 'none'}
              selectedCount={effectiveSelected.size}
              pending={bulk.isPending}
              error={bulk.isError ? bulk.error?.message ?? 'Bulk update failed' : null}
              onApply={apply}
              onMarkReviewed={markReviewed}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a group to review.</p>
        )}
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) setEditTxId(null);
        }}
        transaction={editTx}
      />
    </div>
  );
}
