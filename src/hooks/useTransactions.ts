import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  TransactionCreate,
  TransactionFilters,
  TransactionResponse,
  TransactionStats,
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
