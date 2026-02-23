import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BudgetResponse } from '@/types/budgets';

export function useActiveBudgets() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: () =>
      apiFetch<BudgetResponse[]>('/budgets/?active_only=true&include_spending=true'),
  });
}
