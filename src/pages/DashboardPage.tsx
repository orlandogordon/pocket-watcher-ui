import { Link } from 'react-router-dom';
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
import { ArrowRight } from 'lucide-react';

import { useAccountStats } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useActiveBudgets, useBudgetPerformance } from '@/hooks/useBudgets';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function amountClass(amount: string) {
  return parseFloat(amount) >= 0 ? 'text-green-600' : 'text-red-600';
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

export function DashboardPage() {
  const { data: stats } = useAccountStats();
  const { data: transactions } = useTransactions({ limit: 5, order_desc: true });
  const { data: activeBudgets } = useActiveBudgets();
  const { data: netWorthHistory } = useNetWorthHistory(30);

  const netWorth = parseFloat(stats?.net_worth ?? '0');

  const chartData = (netWorthHistory?.data ?? []).map((pt) => ({
    date: format(parseISO(pt.date), 'MMM d'),
    netWorth: pt.net_worth,
  }));

  const activeBudget = activeBudgets?.[0];
  const { data: activeBudgetPerformance } = useBudgetPerformance(activeBudget?.id ?? '');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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

      {/* Chart + Budget Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Net Worth Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Net Worth — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No history data yet. Run a snapshot to populate the chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                    tickFormatter={(v: number) =>
                      v >= 1000 || v <= -1000
                        ? `$${(v / 1000).toFixed(0)}k`
                        : `$${v}`
                    }
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
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#netWorthGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Active Budget */}
        <Card>
          <CardHeader>
            <CardTitle>Active Budget</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeBudget ? (
              <p className="text-sm text-muted-foreground">No active budget.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold">{activeBudget.budget_name}</p>
                {(activeBudgetPerformance ?? []).slice(0, 6).map((item) => {
                  const pct = Math.min(100, item.percentage_used ?? 0);
                  return (
                    <div key={item.category_uuid} className="space-y-1">
                      <div className="flex justify-between text-xs gap-2">
                        <span className="truncate text-muted-foreground">{item.category_name}</span>
                        <span className={`shrink-0 ${item.over_budget ? 'text-red-600 font-medium' : ''}`}>
                          {formatCurrency(item.spent_amount)} / {formatCurrency(item.allocated_amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            item.over_budget ? 'bg-red-500' : 'bg-primary'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!activeBudgetPerformance && (
                  <p className="text-xs text-muted-foreground">Loading categories...</p>
                )}
                {activeBudgetPerformance && activeBudgetPerformance.length > 6 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{activeBudgetPerformance.length - 6} more categories
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/transactions">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground w-20">Date</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground w-28">Type</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">
                      {format(parseISO(txn.transaction_date), 'MMM d')}
                    </td>
                    <td className="py-2 max-w-0 truncate pr-4">
                      <span title={txn.description}>
                        {txn.merchant_name ?? txn.description}
                      </span>
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {txn.transaction_type}
                      </Badge>
                    </td>
                    <td className={`py-2 text-right font-medium tabular-nums ${amountClass(txn.amount)}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
