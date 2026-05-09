import { format, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { AlertTriangle } from 'lucide-react';

import { useAccountHistory } from '@/hooks/useAccountHistory';
import { formatCurrency } from '@/lib/format';
import type { AccountResponse } from '@/types/accounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountHistoryCardProps {
  account: AccountResponse;
  days: number;
  dateFormat: string;
}

function AccountTooltip({
  active,
  payload,
  hasBreakdown,
  isLiability,
}: TooltipProps<number, string> & { hasBreakdown: boolean; isLiability: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as {
    rawDate: string;
    balance: number;
    prevBalance: number | null;
    securities?: number;
    cash?: number;
  };
  const delta = d.prevBalance != null ? d.balance - d.prevBalance : null;
  const pct =
    d.prevBalance != null && d.prevBalance !== 0
      ? (delta! / Math.abs(d.prevBalance)) * 100
      : null;
  // For liabilities, a balance increase is bad for the user — flip color.
  const isFavorable = delta != null && (isLiability ? delta < 0 : delta >= 0);

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <div className="font-semibold mb-1">{format(parseISO(d.rawDate), 'MMM d, yyyy')}</div>
      {hasBreakdown ? (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Securities</span>
            <span>{formatCurrency(d.securities ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cash</span>
            <span>{formatCurrency(d.cash ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t pt-1 mt-1">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-medium">{formatCurrency(d.balance)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-medium">{formatCurrency(d.balance)}</span>
        </div>
      )}
      {delta != null && (
        <div className={`text-xs mt-1 ${isFavorable ? 'text-green-600' : 'text-red-600'}`}>
          {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}
          {formatCurrency(delta)}
          {pct != null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`}
        </div>
      )}
    </div>
  );
}

export function AccountHistoryCard({ account, days, dateFormat }: AccountHistoryCardProps) {
  const { data: history, isLoading } = useAccountHistory(account.uuid, days);
  const isInvestment = account.account_type === 'INVESTMENT';

  const dataPoints = history?.data ?? [];
  const hasReviewNeeded = dataPoints.some((pt) => pt.needs_review);

  const hasBreakdown = isInvestment && dataPoints.some((pt) => pt.securities_value != null);

  const chartData = dataPoints.map((pt, i) => ({
    date: format(parseISO(pt.value_date), dateFormat),
    rawDate: pt.value_date,
    balance: parseFloat(pt.balance),
    prevBalance: i > 0 ? parseFloat(dataPoints[i - 1].balance) : null,
    ...(hasBreakdown && {
      securities: parseFloat(pt.securities_value ?? '0'),
      cash: parseFloat(pt.cash_balance ?? '0'),
    }),
  }));

  const firstBal = chartData.length > 0 ? chartData[0].balance : 0;
  const lastBal = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;
  const isLiability = account.account_type === 'CREDIT_CARD' || account.account_type === 'LOAN';
  const trendUp = lastBal >= firstBal;
  const strokeColor = (isLiability ? !trendUp : trendUp) ? '#16a34a' : '#dc2626';
  const gradId = `balGrad-${account.uuid}`;

  const yFormatter = (v: number) =>
    v >= 1000 || v <= -1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{account.account_name}</CardTitle>
        <p className="text-xs text-muted-foreground">{account.institution_name}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No history data.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  {hasBreakdown ? (
                    <>
                      <linearGradient id={`secGrad-${account.uuid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`cashGrad-${account.uuid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </>
                  ) : (
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={yFormatter}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  content={
                    <AccountTooltip hasBreakdown={hasBreakdown} isLiability={isLiability} />
                  }
                />
                {hasBreakdown ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="securities"
                      stackId="1"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill={`url(#secGrad-${account.uuid})`}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      stackId="1"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill={`url(#cashGrad-${account.uuid})`}
                      dot={false}
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={strokeColor}
                    strokeWidth={2}
                    fill={`url(#${gradId})`}
                    baseValue="dataMin"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
            {hasReviewNeeded && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Some data points may need review
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
