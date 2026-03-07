import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
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
