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
import type { TooltipContentProps } from 'recharts';

import { useAccounts, useAccountStats } from '@/hooks/useAccounts';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountHistoryCard } from '@/components/net-worth/AccountHistoryCard';

const RANGE_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 3650 },
] as const;

function NetWorthTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload as {
    rawDate: string;
    netWorth: number;
    prevNetWorth: number | null;
    accountsTotal: number;
    accountsFresh: number;
  };
  const delta = d.prevNetWorth != null ? d.netWorth - d.prevNetWorth : null;
  const pct =
    d.prevNetWorth != null && d.prevNetWorth !== 0
      ? (delta! / Math.abs(d.prevNetWorth)) * 100
      : null;
  const staleCount = d.accountsTotal - d.accountsFresh;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <div className="font-semibold mb-1">{formatDate(d.rawDate)}</div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Net Worth</span>
        <span className="font-medium">{formatCurrency(d.netWorth)}</span>
      </div>
      {delta != null && (
        <div className={`text-xs mt-1 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}
          {formatCurrency(delta)}
          {pct != null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`}
        </div>
      )}
      {staleCount > 0 && (
        <div className="text-xs mt-1 text-muted-foreground">
          {staleCount} of {d.accountsTotal} accounts stale on this date
        </div>
      )}
    </div>
  );
}

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
  const { data: netWorthHistory, isLoading: isHistoryLoading } = useNetWorthHistory(days);
  const { data: accounts } = useAccounts();

  const netWorth = parseFloat(stats?.net_worth ?? '0');
  const dateFormat = days <= 90 ? 'MMM d' : "MMM ''yy";

  const allPoints = netWorthHistory?.data ?? [];
  const firstNonZeroIdx = allPoints.findIndex((pt) => pt.accounts_total > 0);
  const rawPoints = firstNonZeroIdx >= 0 ? allPoints.slice(firstNonZeroIdx) : [];
  const chartData = rawPoints.map((pt, i) => ({
    ts: parseISO(pt.date).getTime(),
    rawDate: pt.date,
    netWorth: pt.net_worth,
    prevNetWorth: i > 0 ? rawPoints[i - 1].net_worth : null,
    accountsTotal: pt.accounts_total,
    accountsFresh: pt.accounts_fresh,
  }));

  const firstVal = rawPoints.length > 0 ? rawPoints[0].net_worth : 0;
  const lastVal = rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].net_worth : 0;
  const trendUp = lastVal >= firstVal;
  const chartColor = trendUp ? '#16a34a' : '#dc2626';

  const latestPoint = rawPoints.length > 0 ? rawPoints[rawPoints.length - 1] : null;
  const showStalenessCaption =
    latestPoint != null && latestPoint.accounts_fresh < latestPoint.accounts_total;

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
          <div style={{ height: 350 }} className="flex items-center justify-center">
            {isHistoryLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No history data yet. Run a snapshot to populate the chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwNetWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ts: number) => format(new Date(ts), dateFormat)}
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
                <Tooltip content={<NetWorthTooltip />} animationDuration={0} />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#nwNetWorthGrad)"
                  baseValue="dataMin"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {showStalenessCaption && latestPoint && (
            <p className="text-xs text-muted-foreground mt-2">
              As of {formatDate(latestPoint.date)}:{' '}
              {latestPoint.accounts_total - latestPoint.accounts_fresh} of{' '}
              {latestPoint.accounts_total} accounts using carried-forward balances
              {latestPoint.oldest_snapshot_date &&
                ` (oldest snapshot: ${formatDate(latestPoint.oldest_snapshot_date)})`}
            </p>
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
                key={account.id}
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
