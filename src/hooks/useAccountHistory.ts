import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/api';

export interface AccountValueDataPoint {
  date: string;
  balance: string;
  securities_value: string | null;
  cash_balance: string | null;
  total_cost_basis: string | null;
  unrealized_gain_loss: string | null;
  realized_gain_loss: string | null;
  is_carried_forward: boolean;
  source_snapshot_uuid: string | null;
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
