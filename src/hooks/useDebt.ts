import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DebtPaymentResponse, DebtPaymentCreate } from '@/types/debt';

export function useDebtPayments(accountUuid: string) {
  return useQuery({
    queryKey: ['debt', 'payments', accountUuid],
    queryFn: () =>
      apiFetch<DebtPaymentResponse[]>(
        `/debt/accounts/${accountUuid}/payments/`,
      ),
    enabled: !!accountUuid,
  });
}

export function useCreateDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DebtPaymentCreate) =>
      apiFetch<DebtPaymentResponse>('/debt/payments/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['debt', 'payments', variables.loan_account_uuid] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, accountUuid }: { uuid: string; accountUuid: string }) =>
      apiFetch<void>(`/debt/payments/${uuid}/`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['debt', 'payments', variables.accountUuid] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
