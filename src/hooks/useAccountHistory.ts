import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/api';

export interface AccountValueDataPoint {
  account_uuid: string;
  value_date: string;
  balance: string;
  total_cost_basis: string | null;
  unrealized_gain_loss: string | null;
  securities_value?: string;
  cash_balance?: string;
  needs_review?: boolean;
  snapshot_source: string;
  created_at: string;
}

interface AccountValueHistoryResponse {
  account_uuid: string;
  account_name: string;
  account_type: string;
  data: AccountValueDataPoint[];
}

export function useAccountHistory(accountUuid: string, days = 90) {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['account-history', accountUuid, days],
    queryFn: () =>
      apiFetch<AccountValueHistoryResponse>(
        `/account-history/accounts/${accountUuid}?start_date=${startDate}&end_date=${endDate}`,
      ),
    enabled: !!accountUuid,
  });
}
