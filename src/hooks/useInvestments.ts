import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  InvestmentHoldingResponse,
  InvestmentHoldingCreate,
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

export function useCreateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvestmentHoldingCreate) =>
      apiFetch<InvestmentHoldingResponse>('/investments/holdings/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.account_uuid] });
    },
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: InvestmentHoldingCreate }) =>
      apiFetch<InvestmentHoldingResponse>(`/investments/holdings/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.data.account_uuid] });
    },
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, accountUuid }: { uuid: string; accountUuid: string }) =>
      apiFetch<void>(`/investments/holdings/${uuid}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.accountUuid] });
    },
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
