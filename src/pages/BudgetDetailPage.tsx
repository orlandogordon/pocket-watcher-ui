import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useBudget, useBudgetPerformance } from '@/hooks/useBudgets';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BudgetPerformanceItem } from '@/types/budgets';

function formatDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy');
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
        <p className={cn('text-2xl font-bold', valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function deriveStats(performance: BudgetPerformanceItem[]) {
  const totalAllocated = performance.reduce(
    (sum, item) => sum + parseFloat(item.allocated_amount),
    0,
  );
  const totalSpent = performance.reduce(
    (sum, item) => sum + parseFloat(item.spent_amount),
    0,
  );
  const totalRemaining = totalAllocated - totalSpent;
  const pctUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  return { totalAllocated, totalSpent, totalRemaining, pctUsed };
}

export function BudgetDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { data: budget, isLoading, isError } = useBudget(uuid ?? '');
  const { data: performance } = useBudgetPerformance(uuid ?? '');

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading budget...</p>
      </div>
    );
  }

  if (isError || !budget) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-sm text-destructive">
          Failed to load budget. Make sure the API is running.
        </p>
        <Link
          to="/budgets"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Budgets
        </Link>
      </div>
    );
  }

  // Prefer API-provided totals; fall back to computing from performance data
  const hasApiTotals =
    budget.total_allocated != null &&
    budget.total_spent != null &&
    budget.total_remaining != null &&
    budget.percentage_used != null;

  const perfStats = performance ? deriveStats(performance) : null;

  const totalAllocated = hasApiTotals
    ? parseFloat(budget.total_allocated)
    : perfStats?.totalAllocated ?? 0;
  const totalSpent = hasApiTotals
    ? parseFloat(budget.total_spent)
    : perfStats?.totalSpent ?? 0;
  const totalRemaining = hasApiTotals
    ? parseFloat(budget.total_remaining)
    : perfStats?.totalRemaining ?? 0;
  const pctUsed = hasApiTotals
    ? budget.percentage_used
    : perfStats?.pctUsed ?? 0;

  const isOverBudget = totalSpent > totalAllocated;
  const hasStats = hasApiTotals || perfStats !== null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/budgets"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Budgets
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">{budget.budget_name}</h1>
          {budget.is_active && <Badge>Active</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(budget.start_date)} – {formatDate(budget.end_date)}
        </p>
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Allocated"
            value={formatCurrency(totalAllocated.toString())}
          />
          <StatCard
            title="Total Spent"
            value={formatCurrency(totalSpent.toString())}
            valueClass={isOverBudget ? 'text-destructive' : undefined}
          />
          <StatCard
            title="Remaining"
            value={formatCurrency(totalRemaining.toString())}
            valueClass={totalRemaining < 0 ? 'text-destructive' : 'text-green-600'}
          />
          <StatCard
            title="% Used"
            value={`${pctUsed.toFixed(0)}%`}
          />
        </div>
      )}

      {/* Category Performance */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Category Breakdown</h2>

        {!performance ? (
          <p className="text-sm text-muted-foreground">Loading performance data...</p>
        ) : performance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories in this budget.</p>
        ) : (
          <div className="space-y-3">
            {performance.map((item) => {
              const pct = Math.min(item.percentage_used ?? 0, 100);
              const remaining = parseFloat(item.remaining_amount);
              return (
                <div key={item.category_uuid} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{item.category_name}</span>
                      {item.over_budget && (
                        <Badge variant="destructive" className="shrink-0 text-xs">
                          Over budget
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-right shrink-0">
                      <span className={cn('font-medium', item.over_budget && 'text-destructive')}>
                        {formatCurrency(item.spent_amount)}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}/ {formatCurrency(item.allocated_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        item.over_budget ? 'bg-destructive' : 'bg-primary',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{(item.percentage_used ?? 0).toFixed(0)}% used</span>
                    <span className={cn(remaining < 0 && 'text-destructive font-medium')}>
                      {remaining >= 0
                        ? `${formatCurrency(item.remaining_amount)} remaining`
                        : `${formatCurrency(Math.abs(remaining).toString())} over`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
