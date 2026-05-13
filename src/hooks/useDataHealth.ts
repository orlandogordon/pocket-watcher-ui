import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  AttentionAction,
  AttentionItem,
  AttentionKind,
  DataHealthCountResponse,
} from '@/types/data-health';

export const dataHealthKeys = {
  items: () => ['data-health', 'items'] as const,
  count: () => ['data-health', 'count'] as const,
};

// Backend /count is ~2s warm at real-data scale (1,300+ items). Avoid
// re-firing on every page navigation; stale-after-2-min strikes a balance.
const COUNT_STALE_MS = 2 * 60 * 1000;
const ITEMS_STALE_MS = 30 * 1000;

export function useAttentionItems() {
  return useQuery({
    queryKey: dataHealthKeys.items(),
    queryFn: () => apiFetch<AttentionItem[]>('/data-health/items'),
    staleTime: ITEMS_STALE_MS,
  });
}

export function useAttentionCount() {
  return useQuery({
    queryKey: dataHealthKeys.count(),
    queryFn: () => apiFetch<DataHealthCountResponse>('/data-health/count'),
    staleTime: COUNT_STALE_MS,
  });
}

// Generic action dispatcher. The backend pre-resolves method+href+body per
// item, so the inbox does not need per-kind logic.
//
// We pass the item's `kind` alongside the action so onSuccess can invalidate
// the right downstream caches (transactions list after a transfer confirm,
// snapshots after a snapshot dismiss, etc.). Per-item errors propagate
// through the mutation's `error` state — callers should render inline.
export function useAttentionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
    }: {
      action: AttentionAction;
      kind: AttentionKind;
      itemId: string;
    }) =>
      apiFetch<unknown>(action.href, {
        method: action.method,
        body: action.body ? JSON.stringify(action.body) : undefined,
      }),
    onSuccess: (_data, { kind }) => {
      // Always refresh the inbox feed and the badge count.
      qc.invalidateQueries({ queryKey: dataHealthKeys.items() });
      qc.invalidateQueries({ queryKey: dataHealthKeys.count() });

      // Downstream entity caches affected by each kind:
      switch (kind) {
        case 'needs_review':
          // Removing the system tag changes the transaction row's tags.
          qc.invalidateQueries({ queryKey: ['transactions'] });
          qc.invalidateQueries({ queryKey: ['tags', 'stats'] });
          break;
        case 'transfer_pair':
          // Confirm reclassifies + links rows; dismiss persists the dismissal.
          qc.invalidateQueries({ queryKey: ['transactions'] });
          qc.invalidateQueries({ queryKey: ['transfers', 'suggestions'] });
          qc.invalidateQueries({ queryKey: ['transfers', 'orphans'] });
          break;
        case 'snapshot_review':
          // Snapshot dismiss flips a row in account_value_history.
          qc.invalidateQueries({ queryKey: ['account-history'] });
          qc.invalidateQueries({ queryKey: ['accounts'] });
          break;
        case 'transfer_orphan':
          // No action endpoint exists yet (backend follow-up); included for
          // future-proofing once the dismissal endpoint lands.
          qc.invalidateQueries({ queryKey: ['transfers', 'orphans'] });
          break;
      }
    },
  });
}
