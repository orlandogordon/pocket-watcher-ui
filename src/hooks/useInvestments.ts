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

// The list endpoint defaults to limit=100 and the detail page does all of its
// filtering/sorting/paging client-side, so we fetch the full history here by
// walking pages until a short one comes back. Page size matches the backend's
// known-honored default (avoids tripping any `le` cap on `limit`); the render
// itself stays paginated, so the full array never hits the DOM at once.
const INVESTMENT_TX_PAGE_SIZE = 100;

export function useInvestmentTransactions(accountUuid: string) {
  return useQuery({
    queryKey: ['investments', 'transactions', accountUuid],
    queryFn: async () => {
      const byId = new Map<string, InvestmentTransactionResponse>();
      for (let skip = 0; ; skip += INVESTMENT_TX_PAGE_SIZE) {
        const page = await apiFetch<InvestmentTransactionResponse[]>(
          `/investments/accounts/${accountUuid}/transactions/?skip=${skip}&limit=${INVESTMENT_TX_PAGE_SIZE}`,
        );
        // Dedupe by id in case OFFSET paging overlaps under unstable ordering.
        for (const tx of page) byId.set(tx.id, tx);
        if (page.length < INVESTMENT_TX_PAGE_SIZE) break;
      }
      return [...byId.values()];
    },
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
    mutationFn: ({ uuid }: { uuid: string; accountUuid: string }) =>
      apiFetch<void>(`/investments/transactions/${uuid}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments', 'transactions', variables.accountUuid] });
      qc.invalidateQueries({ queryKey: ['investments', 'holdings', variables.accountUuid] });
    },
  });
}
