import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AccountCreate, AccountResponse, AccountStats } from '@/types/accounts';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<AccountResponse[]>('/accounts/'),
  });
}

export function useAccountStats() {
  return useQuery({
    queryKey: ['accounts', 'stats'],
    queryFn: () => apiFetch<AccountStats>('/accounts/stats'),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountCreate) =>
      apiFetch<AccountResponse>('/accounts/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: AccountCreate }) =>
      apiFetch<AccountResponse>(`/accounts/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, force }: { uuid: string; force?: boolean }) =>
      apiFetch<void>(`/accounts/${uuid}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, { force }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      if (force) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['debt'] });
        queryClient.invalidateQueries({ queryKey: ['account-history'] });
        queryClient.invalidateQueries({ queryKey: ['upload-jobs'] });
      }
    },
  });
}
