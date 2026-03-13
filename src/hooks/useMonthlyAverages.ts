import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MonthlyAverageResponse } from '@/types/analytics';

export function useMonthlyAverages(
  year: number,
  accountUuids?: string[],
  month?: number,
) {
  const params = new URLSearchParams({ year: String(year) });
  if (month) params.set('month', String(month));
  accountUuids?.forEach((uuid) => params.append('account_uuid', uuid));

  return useQuery({
    queryKey: ['transactions', 'monthly-averages', year, month, accountUuids],
    queryFn: () =>
      apiFetch<MonthlyAverageResponse>(
        `/transactions/stats/monthly-averages?${params}`,
      ),
  });
}
