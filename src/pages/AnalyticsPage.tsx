import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChevronRight } from 'lucide-react';

import { useMonthlyAverages } from '@/hooks/useMonthlyAverages';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MonthlyAverageCategoryBreakdown } from '@/types/analytics';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function StatCard({
  title,
  value,
  valueClass,
  subtitle,
}: {
  title: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold', valueClass)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  totalExpenses,
}: {
  category: MonthlyAverageCategoryBreakdown;
  totalExpenses: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = parseFloat(category.total);
  const pct = totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : '0.0';
  const hasSubs = category.subcategories.length > 0;

  return (
    <>
      <tr
        className={cn('border-b last:border-0', hasSubs && 'cursor-pointer hover:bg-accent/50')}
        onClick={() => hasSubs && setExpanded(!expanded)}
      >
        <td className="py-2.5 pr-2">
          <span className="flex items-center gap-1.5">
            {hasSubs && (
              <ChevronRight
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-90')}
              />
            )}
            {!hasSubs && <span className="w-3.5" />}
            {category.category_name}
          </span>
        </td>
        <td className="py-2.5 text-right tabular-nums">{formatCurrency(category.total)}</td>
        <td className="py-2.5 text-right tabular-nums">{formatCurrency(category.monthly_average)}</td>
        <td className="py-2.5 text-right tabular-nums">{pct}%</td>
      </tr>
      {expanded &&
        category.subcategories.map((sub) => (
          <tr key={sub.subcategory_uuid} className="border-b last:border-0 text-muted-foreground">
            <td className="py-2 pr-2 pl-9 text-sm">{sub.subcategory_name}</td>
            <td className="py-2 text-right tabular-nums text-sm">{formatCurrency(sub.total)}</td>
            <td className="py-2 text-right tabular-nums text-sm">{formatCurrency(sub.monthly_average)}</td>
            <td className="py-2 text-right tabular-nums text-sm">
              {totalExpenses > 0
                ? ((parseFloat(sub.total) / totalExpenses) * 100).toFixed(1)
                : '0.0'}
              %
            </td>
          </tr>
        ))}
    </>
  );
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function AnalyticsPage() {
  const [year, setYear] = useState(currentYear);
  const [accountUuids, setAccountUuids] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();

  const { data: accounts } = useAccounts();
  const acctFilter = accountUuids.length > 0 ? accountUuids : undefined;

  // Full-year data for the chart + summary cards
  const { data, isLoading } = useMonthlyAverages(year, acctFilter);

  // Month-scoped data for the category table (falls back to full-year when no month selected)
  const { data: categoryData } = useMonthlyAverages(
    year,
    acctFilter,
    selectedMonth,
  );

  const accountOptions = useMemo(
    () =>
      (accounts ?? []).map((a) => ({
        value: a.uuid,
        label: `${a.account_name} (${a.institution_name})`,
      })),
    [accounts],
  );

  const chartData = useMemo(
    () =>
      (data?.by_month ?? []).map((m, i) => ({
        month: MONTH_LABELS[i],
        monthIndex: i + 1,
        income: parseFloat(m.income),
        expenses: parseFloat(m.expenses),
        net: parseFloat(m.net),
      })),
    [data],
  );

  const activeCategoryData = categoryData ?? data;
  const totalExpenses = parseFloat(activeCategoryData?.totals.total_expenses ?? '0');

  const avgNet = parseFloat(data?.totals.avg_monthly_net ?? '0');

  const handleChartClick = useCallback((state: { activeLabel?: string }) => {
    if (!state?.activeLabel) return;
    const idx = MONTH_LABELS.indexOf(state.activeLabel);
    if (idx === -1) return;
    const month = idx + 1;
    setSelectedMonth((prev) => (prev === month ? undefined : month));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setSelectedMonth(undefined); }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelect
            options={accountOptions}
            value={accountUuids}
            onChange={setAccountUuids}
            placeholder="All accounts"
            className="w-56"
          />
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Avg Monthly Income"
              value={formatCurrency(data.totals.avg_monthly_income)}
              valueClass="text-green-600"
              subtitle={`Based on ${data.months_with_data} month${data.months_with_data !== 1 ? 's' : ''} of data`}
            />
            <StatCard
              title="Avg Monthly Expenses"
              value={formatCurrency(data.totals.avg_monthly_expenses)}
              valueClass="text-red-600"
            />
            <StatCard
              title="Avg Monthly Net"
              value={formatCurrency(data.totals.avg_monthly_net)}
              valueClass={avgNet >= 0 ? 'text-green-600' : 'text-red-600'}
            />
          </div>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Click a month to filter the category table below.
              </p>
              {data.months_with_data === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No transaction data for {year}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
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
                      width={56}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), undefined]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>
                Spending by Category
                {selectedMonth && (
                  <Badge
                    variant="secondary"
                    className="ml-2 cursor-pointer"
                    onClick={() => setSelectedMonth(undefined)}
                  >
                    {MONTH_LABELS[selectedMonth - 1]} {year} &times;
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(activeCategoryData?.by_category ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No expense data for {selectedMonth ? `${MONTH_LABELS[selectedMonth - 1]} ${year}` : year}.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium text-muted-foreground">Category</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Total</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Monthly Avg</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">% of Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeCategoryData?.by_category ?? []).map((cat) => (
                      <CategoryRow
                        key={cat.category_uuid}
                        category={cat}
                        totalExpenses={totalExpenses}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
