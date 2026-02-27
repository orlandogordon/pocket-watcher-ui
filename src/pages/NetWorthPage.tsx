import { useState } from 'react';
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

import { useAccounts, useAccountStats } from '@/hooks/useAccounts';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountHistoryCard } from '@/components/net-worth/AccountHistoryCard';

const RANGE_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 3650 },
] as const;

function StatCard({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function NetWorthPage() {
  const [days, setDays] = useState(90);
  const { data: stats } = useAccountStats();
  const { data: netWorthHistory } = useNetWorthHistory(days);
  const { data: accounts } = useAccounts();

  const netWorth = parseFloat(stats?.net_worth ?? '0');
  const dateFormat = days <= 90 ? 'MMM d' : "MMM ''yy";

  const chartData = (netWorthHistory?.data ?? []).map((pt) => ({
    date: format(parseISO(pt.date), dateFormat),
    netWorth: pt.net_worth,
  }));

  const rawHistory = netWorthHistory?.data ?? [];
  const firstVal = rawHistory.length > 0 ? rawHistory[0].net_worth : 0;
  const lastVal = rawHistory.length > 0 ? rawHistory[rawHistory.length - 1].net_worth : 0;
  const trendUp = lastVal >= firstVal;
  const chartColor = trendUp ? '#16a34a' : '#dc2626';

  const yFormatter = (v: number) =>
    v >= 1000 || v <= -1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Net Worth</h1>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              variant={days === opt.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Net Worth"
          value={formatCurrency(stats?.net_worth ?? '0')}
          valueClass={netWorth >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Total Assets"
          value={formatCurrency(stats?.total_assets ?? '0')}
          valueClass="text-green-600"
        />
        <StatCard
          title="Total Liabilities"
          value={formatCurrency(stats?.total_liabilities ?? '0')}
          valueClass="text-red-600"
        />
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No history data yet. Run a snapshot to populate the chart.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwNetWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={yFormatter}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    formatCurrency(String(value ?? 0)),
                    'Net Worth',
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#nwNetWorthGrad)"
                  baseValue="dataMin"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Account History */}
      {accounts && accounts.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Account History</h2>
          <div className="grid grid-cols-2 gap-4">
            {accounts.map((account) => (
              <AccountHistoryCard
                key={account.uuid}
                account={account}
                days={days}
                dateFormat={dateFormat}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
