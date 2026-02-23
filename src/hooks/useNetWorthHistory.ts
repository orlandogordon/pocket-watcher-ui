import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/api';

export interface NetWorthDataPoint {
  value_date: string;
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
}

interface NetWorthHistoryResponse {
  data_points: NetWorthDataPoint[];
  start_date: string;
  end_date: string;
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
