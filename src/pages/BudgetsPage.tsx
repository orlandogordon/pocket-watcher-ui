import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import {
  useBudgetMonth,
  useBudgetMonthPerformance,
  useTemplates,
  useAssignTemplate,
} from '@/hooks/useBudgets';
import { useTransactionStats } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { BudgetPerformanceItem } from '@/types/budgets';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function StatCard({ title, value, valueClass }: { title: string; value: string; valueClass?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClass ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function progressColor(pct: number) {
  if (pct > 100) return 'bg-red-500';
  if (pct > 80) return 'bg-yellow-500';
  return 'bg-primary';
}

function isOverBudget(status: string) {
  return status === 'over_budget';
}

function progressTextColor(status: string) {
  return isOverBudget(status) ? 'text-red-600 font-medium' : '';
}

export function BudgetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const { data: budgetMonth, isLoading: monthLoading } = useBudgetMonth(year, month);
  const { data: performance } = useBudgetMonthPerformance(year, month);
  const { data: templates } = useTemplates();
  const assignTemplate = useAssignTemplate();

  // Transaction stats for the selected month — used to compute uncovered spending
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data: txnStats } = useTransactionStats({ date_from: dateFrom, date_to: dateTo });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function goPrev() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function handleTemplateChange(value: string) {
    assignTemplate.mutate({
      year,
      month,
      data: { template_uuid: value === 'none' ? null : value },
    });
  }

  // Group performance items: parent categories with their subcategories
  const grouped = useMemo(() => {
    if (!performance) return [];
    const parents: (BudgetPerformanceItem & { children: BudgetPerformanceItem[] })[] = [];
    const childMap = new Map<string, BudgetPerformanceItem[]>();

    for (const item of performance) {
      if (item.subcategory_uuid) {
        const existing = childMap.get(item.category_uuid) ?? [];
        existing.push(item);
        childMap.set(item.category_uuid, existing);
      } else {
        parents.push({ ...item, children: [] });
      }
    }

    for (const parent of parents) {
      parent.children = childMap.get(parent.category_uuid) ?? [];
    }

    // Items that are subcategories with no parent row — show standalone
    const parentUuids = new Set(parents.map((p) => p.category_uuid));
    for (const [catUuid, children] of childMap) {
      if (!parentUuids.has(catUuid)) {
        for (const child of children) {
          parents.push({ ...child, children: [] });
        }
      }
    }

    return parents;
  }, [performance]);

  // Year range for picker: 5 years back to current year
  const pickerYears = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budget</h1>
        <Button variant="outline" asChild>
          <Link to="/budgets/templates">
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Templates
          </Link>
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-48 font-semibold">
              {MONTH_NAMES[month - 1]} {year}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select
                value={String(year)}
                onValueChange={(v) => {
                  const newYear = Number(v);
                  // Clamp month if jumping to current year and month is in the future
                  const maxMonth = newYear === now.getFullYear() ? now.getMonth() + 1 : 12;
                  setYear(newYear);
                  setMonth((m) => Math.min(m, maxMonth));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pickerYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => {
                    const m = i + 1;
                    const isFuture = year === now.getFullYear() && m > now.getMonth() + 1;
                    return (
                      <SelectItem key={m} value={String(m)} disabled={isFuture}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={goNext} disabled={isCurrentMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Template Assignment */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Template:</label>
        <Select
          value={budgetMonth?.template?.id ?? 'none'}
          onValueChange={handleTemplateChange}
          disabled={assignTemplate.isPending}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No template</SelectItem>
            {(templates ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.template_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignTemplate.isPending && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </div>

      {monthLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {/* Stats Cards — computed from top-level performance items */}
      {performance && performance.length > 0 && (() => {
        // Only sum parent-level items (no subcategory) to avoid double-counting
        const topLevel = performance.filter((p) => !p.subcategory_uuid);
        const totalAllocated = topLevel.reduce((s, p) => s + parseFloat(p.allocated_amount), 0);
        const totalSpent = topLevel.reduce((s, p) => s + parseFloat(p.spent_amount), 0);
        const totalRemaining = totalAllocated - totalSpent;
        const pctUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
        return (
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Allocated" value={formatCurrency(String(totalAllocated))} />
            <StatCard
              title="Total Spent"
              value={formatCurrency(String(totalSpent))}
              valueClass="text-red-600"
            />
            <StatCard
              title="Remaining"
              value={formatCurrency(String(totalRemaining))}
              valueClass={totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <StatCard
              title="% Used"
              value={`${pctUsed.toFixed(1)}%`}
              valueClass={pctUsed > 100 ? 'text-red-600' : ''}
            />
          </div>
        );
      })()}

      {/* No Template State */}
      {!monthLoading && !budgetMonth?.template && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No template assigned to this month.{' '}
              <Link to="/budgets/templates" className="text-primary underline">
                Create a template
              </Link>{' '}
              or select one above.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Performance Breakdown */}
      {grouped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.map((item) => {
              const pct = Math.min(100, item.percentage_used ?? 0);
              const displayPct = item.percentage_used ?? 0;
              return (
                <div key={`${item.category_uuid}-${item.subcategory_uuid ?? 'parent'}`}>
                  {/* Parent row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {item.subcategory_name
                          ? `${item.category_name} > ${item.subcategory_name}`
                          : item.category_name}
                      </span>
                      <span className={`tabular-nums ${progressTextColor(item.status)}`}>
                        {formatCurrency(item.spent_amount)} / {formatCurrency(item.allocated_amount)}
                        <span className="text-muted-foreground ml-1">
                          ({displayPct.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={`h-2 rounded-full transition-all ${progressColor(displayPct)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Remaining: {formatCurrency(item.remaining_amount)}</span>
                    </div>
                  </div>

                  {/* Subcategory rows */}
                  {item.children.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 pl-4">
                      {item.children.map((sub) => {
                        const subPct = Math.min(100, sub.percentage_used ?? 0);
                        const subDisplayPct = sub.percentage_used ?? 0;
                        return (
                          <div key={`${sub.category_uuid}-${sub.subcategory_uuid}`} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {sub.subcategory_name ?? sub.category_name}
                              </span>
                              <span className={`tabular-nums ${progressTextColor(sub.status)}`}>
                                {formatCurrency(sub.spent_amount)} / {formatCurrency(sub.allocated_amount)}
                                <span className="text-muted-foreground ml-1">
                                  ({subDisplayPct.toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div
                                className={`h-1.5 rounded-full transition-all ${progressColor(subDisplayPct)}`}
                                style={{ width: `${Math.min(subPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Unallocated remainder */}
                      {(() => {
                        const parentAmt = parseFloat(item.allocated_amount);
                        const subSum = item.children.reduce(
                          (s, c) => s + parseFloat(c.allocated_amount),
                          0,
                        );
                        const unallocated = parentAmt - subSum;
                        if (unallocated > 0.005) {
                          return (
                            <div className="flex justify-between text-xs text-muted-foreground italic">
                              <span>Unallocated</span>
                              <span className="tabular-nums">{formatCurrency(String(unallocated))}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Uncovered spending — transactions not matched by any budget category */}
      {txnStats && performance && budgetMonth?.template && (() => {
        const totalMonthExpenses = parseFloat(txnStats.total_expenses);
        const budgetedSpent = performance
          .filter((p) => !p.subcategory_uuid)
          .reduce((s, p) => s + parseFloat(p.spent_amount), 0);
        const uncovered = totalMonthExpenses - budgetedSpent;
        if (uncovered < 0.01) return null;
        return (
          <div className="flex items-center justify-between rounded-md border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Spending outside budgeted categories
            </span>
            <span className="font-medium tabular-nums text-amber-600">
              {formatCurrency(String(uncovered))}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
