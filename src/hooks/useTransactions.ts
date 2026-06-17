import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { dataHealthKeys } from '@/hooks/useDataHealth';
import type { AttentionItem } from '@/types/data-health';
import type {
  TransactionCreate,
  TransactionFilters,
  TransactionResponse,
  TransactionStats,
  SplitAllocationCreate,
  AmortizationScheduleResponse,
  AmortizationEqualSplit,
  AmortizationCustom,
  TransactionRelationshipResponse,
  TransactionRelationshipCreate,
  TransactionRelationshipUpdate,
  BulkTransactionUpdate,
  BulkTransactionUpdateResponse,
} from '@/types/transactions';

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiFetch<TransactionResponse[]>(`/transactions/${buildQuery(filters)}`),
  });
}

export function useTransaction(uuid: string | null) {
  return useQuery({
    queryKey: ['transaction', uuid],
    queryFn: () => apiFetch<TransactionResponse>(`/transactions/${uuid}`),
    enabled: !!uuid,
  });
}

export function useTransactionStats(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', 'stats', filters],
    queryFn: () => apiFetch<TransactionStats>(`/transactions/stats${buildQuery(filters)}`),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) =>
      apiFetch<TransactionResponse>('/transactions/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // Type changes shrink/grow the transfer inbox (orphans + suggestions).
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: TransactionCreate }) =>
      apiFetch<TransactionResponse>(`/transactions/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

/**
 * Atomic bulk update for the grouped inbox review workspace
 * (`PATCH /transactions/bulk`, backend #81). Applies one `patch` + optional tag
 * add/remove + `clear_review` to every uuid in a single round-trip.
 *
 * When `clear_review` is true the rows leave the needs_review queue, so we
 * optimistically drop them from the cached `/data-health/items` array (that
 * fetch is ~2s warm at scale). When it is false the rows stay in the queue —
 * we skip the optimistic removal and just refetch so the new fields show.
 */
export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkTransactionUpdate) =>
      apiFetch<BulkTransactionUpdateResponse>('/transactions/bulk', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, body) => {
      if (body.clear_review) {
        const applied = new Set(body.uuids);
        queryClient.setQueryData<AttentionItem[]>(dataHealthKeys.items(), (prev) =>
          prev?.filter(
            (i) => !(i.kind === 'needs_review' && applied.has(i.subject.primary_uuid)),
          ),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: dataHealthKeys.items() });
      queryClient.invalidateQueries({ queryKey: dataHealthKeys.count() });
      queryClient.invalidateQueries({ queryKey: ['tags', 'stats'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/transactions/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

export function useUpdateSplits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, allocations }: {
      uuid: string;
      allocations: SplitAllocationCreate[];
    }) =>
      apiFetch<TransactionResponse>(`/transactions/${uuid}/splits`, {
        method: 'PUT',
        body: JSON.stringify({ allocations }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteSplits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/transactions/${uuid}/splits`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useAmortization(uuid: string | null) {
  return useQuery({
    queryKey: ['transactions', uuid, 'amortization'],
    queryFn: async () => {
      try {
        return await apiFetch<AmortizationScheduleResponse>(
          `/transactions/${uuid}/amortization`
        );
      } catch (e) {
        if (e instanceof Error && e.message === 'No amortization schedule found') {
          return null;
        }
        throw e;
      }
    },
    enabled: !!uuid,
    retry: false,
  });
}

export function useCreateAmortization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: {
      uuid: string;
      data: AmortizationEqualSplit | AmortizationCustom;
    }) =>
      apiFetch<AmortizationScheduleResponse>(
        `/transactions/${uuid}/amortization`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteAmortization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/transactions/${uuid}/amortization`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

// --- Relationship hooks ---

export function useTransactionRelationships(uuid: string | null) {
  return useQuery({
    queryKey: ['transactions', uuid, 'relationships'],
    queryFn: () => apiFetch<TransactionRelationshipResponse[]>(
      `/transactions/${uuid}/relationships`
    ),
    enabled: !!uuid,
  });
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: {
      uuid: string;
      data: TransactionRelationshipCreate;
    }) =>
      apiFetch<TransactionRelationshipResponse>(
        `/transactions/${uuid}/relationships`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ relationshipUuid, data }: {
      relationshipUuid: string;
      data: TransactionRelationshipUpdate;
    }) =>
      apiFetch<TransactionRelationshipResponse>(
        `/transactions/relationships/${relationshipUuid}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationshipUuid: string) =>
      apiFetch<void>(
        `/transactions/relationships/${relationshipUuid}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
