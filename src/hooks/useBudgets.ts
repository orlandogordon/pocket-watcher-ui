import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  BudgetResponse,
  BudgetCreate,
  BudgetUpdate,
  BudgetCategoryCreate,
  BudgetCategoryResponse,
  BudgetPerformanceItem,
} from '@/types/budgets';

export function useActiveBudgets() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: () =>
      apiFetch<BudgetResponse[]>('/budgets/?active_only=true&include_spending=true'),
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiFetch<BudgetResponse[]>('/budgets/?include_spending=true'),
  });
}

export function useBudget(uuid: string) {
  return useQuery({
    queryKey: ['budgets', uuid],
    queryFn: () => apiFetch<BudgetResponse>(`/budgets/${uuid}`),
    enabled: !!uuid,
  });
}

export function useBudgetPerformance(uuid: string) {
  return useQuery({
    queryKey: ['budgets', uuid, 'performance'],
    queryFn: () => apiFetch<BudgetPerformanceItem[]>(`/budgets/${uuid}/performance`),
    enabled: !!uuid,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetCreate) =>
      apiFetch<BudgetResponse>('/budgets/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: BudgetUpdate }) =>
      apiFetch<BudgetResponse>(`/budgets/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/budgets/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useCopyBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uuid,
      name,
      startDate,
      endDate,
    }: {
      uuid: string;
      name: string;
      startDate: string;
      endDate: string;
    }) => {
      const params = new URLSearchParams({
        new_budget_name: name,
        new_start_date: startDate,
        new_end_date: endDate,
      });
      return apiFetch<BudgetResponse>(`/budgets/${uuid}/copy?${params}`, {
        method: 'POST',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useAddBudgetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      budgetUuid,
      data,
    }: {
      budgetUuid: string;
      data: BudgetCategoryCreate;
    }) =>
      apiFetch<BudgetCategoryResponse>(`/budgets/${budgetUuid}/categories/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudgetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryUuid,
      allocated_amount,
    }: {
      categoryUuid: string;
      allocated_amount: string;
    }) =>
      apiFetch<BudgetCategoryResponse>(`/budgets/categories/${categoryUuid}`, {
        method: 'PUT',
        body: JSON.stringify({ allocated_amount }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudgetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryUuid: string) =>
      apiFetch<void>(`/budgets/categories/${categoryUuid}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
