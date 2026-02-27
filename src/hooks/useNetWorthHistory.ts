import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/api';

export interface NetWorthDataPoint {
  date: string;
  net_worth: number;
  total_unrealized_gains: number | null;
}

interface NetWorthHistoryResponse {
  data: NetWorthDataPoint[];
  start_date: string;
  end_date: string;
  total_days: number;
}

export function useNetWorthHistory(days = 30) {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['net-worth-history', days],
    queryFn: () =>
      apiFetch<NetWorthHistoryResponse>(
        `/account-history/net-worth?start_date=${startDate}&end_date=${endDate}`,
      ),
  });
}
