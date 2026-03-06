import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// Types

export interface SnapshotJob {
  id: number;
  account_uuid: string;
  start_date: string;
  end_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  snapshots_created: number;
  snapshots_updated: number;
  snapshots_failed: number;
  snapshots_skipped: number;
}

export interface RecalculateResponse {
  message: string;
  job_id: number;
  account_uuid: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface SnapshotAllResponse {
  message: string;
  count: number;
  date: string;
}

export interface NeedsReviewSnapshot {
  snapshot_uuid: string;
  account_uuid: string;
  value_date: string;
  balance: string;
  total_cost_basis: string | null;
  unrealized_gain_loss: string | null;
  realized_gain_loss: string | null;
  principal_paid_ytd: string | null;
  interest_paid_ytd: string | null;
  needs_review: boolean;
  review_reason: string | null;
  snapshot_source: string;
  created_at: string;
}

// Hooks

export const adminKeys = {
  jobs: (accountUuid: string) => ['admin', 'snapshot-jobs', accountUuid] as const,
  needsReview: (accountUuid: string) => ['admin', 'needs-review', accountUuid] as const,
};

export function useSnapshotJobs(accountUuid: string) {
  return useQuery({
    queryKey: adminKeys.jobs(accountUuid),
    queryFn: () => apiFetch<SnapshotJob[]>(`/accounts/${accountUuid}/snapshot-jobs`),
    enabled: !!accountUuid,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (jobs?.some((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS')) {
        return 5000;
      }
      return false;
    },
  });
}

export function useNeedsReview(accountUuid: string) {
  return useQuery({
    queryKey: adminKeys.needsReview(accountUuid),
    queryFn: () => apiFetch<NeedsReviewSnapshot[]>(`/accounts/${accountUuid}/snapshots/needs-review`),
    enabled: !!accountUuid,
  });
}

export function useRecalculateSnapshots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountUuid,
      startDate,
      endDate,
    }: {
      accountUuid: string;
      startDate: string;
      endDate: string;
    }) =>
      apiFetch<RecalculateResponse>(
        `/accounts/${accountUuid}/snapshots/recalculate?start_date=${startDate}&end_date=${endDate}`,
        { method: 'POST' }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.jobs(variables.accountUuid) });
      queryClient.invalidateQueries({ queryKey: adminKeys.needsReview(variables.accountUuid) });
    },
  });
}

export function useDismissSnapshotReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountUuid,
      snapshotUuids,
      reason,
    }: {
      accountUuid: string;
      snapshotUuids: string[];
      reason?: string;
    }) =>
      apiFetch<{ dismissed_count: number }>(
        `/account-history/accounts/${accountUuid}/snapshots/dismiss-review`,
        {
          method: 'POST',
          body: JSON.stringify({
            snapshot_uuids: snapshotUuids,
            reason: reason ?? 'Dismissed by user',
          }),
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.needsReview(variables.accountUuid),
      });
    },
  });
}

export function useSnapshotAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotDate: string) =>
      apiFetch<SnapshotAllResponse>(
        `/account-history/snapshots/all?snapshot_date=${snapshotDate}`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
