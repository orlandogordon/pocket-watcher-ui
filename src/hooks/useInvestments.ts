import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  InvestmentHoldingResponse,
  InvestmentAccountSummary,
  InvestmentTransactionResponse,
  InvestmentTransactionCreate,
} from '@/types/investments';

export function useInvestmentHoldings(accountUuid: string) {
  return useQuery({
    queryKey: ['investments', 'holdings', accountUuid],
    queryFn: () =>
      apiFetch<InvestmentHoldingResponse[]>(
        `/investments/accounts/${accountUuid}/holdings/`,
      ),
    enabled: !!accountUuid,
  });
}

export function useInvestmentAccountSummary(accountUuid: string) {
  return useQuery({
    queryKey: ['investments', 'summary', accountUuid],
    queryFn: () =>
      apiFetch<InvestmentAccountSummary>(
        `/investments/accounts/${accountUuid}/summary`,
      ),
    enabled: !!accountUuid,
  });
}

export function useInvestmentTransactions(accountUuid: string) {
  return useQuery({
    queryKey: ['investments', 'transactions', accountUuid],
    queryFn: () =>
      apiFetch<InvestmentTransactionResponse[]>(
        `/investments/accounts/${accountUuid}/transactions/`,
      ),
    enabled: !!accountUuid,
  });
}

export function useCreateInvestmentTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvestmentTransactionCreate) =>
      apiFetch<InvestmentTransactionResponse>('/investments/transactions/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'transactions', variables.account_uuid] });
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.account_uuid] });
    },
  });
}

export function useUpdateInvestmentTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: InvestmentTransactionCreate;
    }) =>
      apiFetch<InvestmentTransactionResponse>(`/investments/transactions/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'transactions', variables.data.account_uuid] });
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.data.account_uuid] });
    },
  });
}

export function useRefreshPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number; failed: number }>('/investments/refresh-prices', {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments', 'holdings'] });
      qc.invalidateQueries({ queryKey: ['investments', 'summary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteInvestmentTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, accountUuid }: { uuid: string; accountUuid: string }) =>
      apiFetch<void>(`/investments/transactions/${uuid}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'transactions', variables.accountUuid] });
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.accountUuid] });
    },
  });
}
