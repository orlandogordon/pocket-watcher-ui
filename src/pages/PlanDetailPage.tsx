import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Layers,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  useFinancialPlan,
  useFinancialPlanSummary,
  useDeletePlanMonth,
  syncPlanDates,
} from '@/hooks/useFinancialPlans';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import { PlanFormDialog } from '@/components/financial-plans/PlanFormDialog';
import { DeletePlanDialog } from '@/components/financial-plans/DeletePlanDialog';
import { MonthFormDialog } from '@/components/financial-plans/MonthFormDialog';
import { BulkMonthDialog } from '@/components/financial-plans/BulkMonthDialog';
import { ExpenseFormDialog } from '@/components/financial-plans/ExpenseFormDialog';
import { DeleteExpenseDialog } from '@/components/financial-plans/DeleteExpenseDialog';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  FinancialPlanMonthResponse,
  FinancialPlanExpenseResponse,
} from '@/types/financial-plans';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function deriveMonthRange(months: FinancialPlanMonthResponse[]): string {
  if (months.length === 0) return 'No months yet';
  const sorted = [...months].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.year === last.year && first.month === last.month) {
    return `${MONTH_SHORT[first.month]} ${first.year}`;
  }
  return `${MONTH_SHORT[first.month]} ${first.year} – ${MONTH_SHORT[last.month]} ${last.year}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  valueClass,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function PlanDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = useFinancialPlan(uuid ?? '');
  const { data: summary } = useFinancialPlanSummary(uuid ?? '');
  const { data: categories } = useCategories();
  const categoryMap = buildCategoryMap(categories ?? []);
  const deleteMonth = useDeletePlanMonth();

  // Auto-sync plan start_date/end_date when months change
  const prevMonthCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!plan || !uuid) return;
    const count = plan.monthly_periods.length;
    if (prevMonthCountRef.current !== null && prevMonthCountRef.current !== count) {
      syncPlanDates(uuid, plan.monthly_periods);
    }
    prevMonthCountRef.current = count;
  }, [plan, uuid]);

  // Dialog state
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [monthFormOpen, setMonthFormOpen] = useState(false);
  const [editMonth, setEditMonth] = useState<FinancialPlanMonthResponse | undefined>();
  const [duplicateSource, setDuplicateSource] = useState<FinancialPlanMonthResponse | undefined>();
  const [bulkMonthOpen, setBulkMonthOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseMonth, setExpenseMonth] = useState<string>('');
  const [editExpense, setEditExpense] = useState<FinancialPlanExpenseResponse | undefined>();
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<FinancialPlanExpenseResponse | null>(null);

  function openAddMonth() {
    setEditMonth(undefined);
    setDuplicateSource(undefined);
    setMonthFormOpen(true);
  }

  function openEditMonth(m: FinancialPlanMonthResponse) {
    setEditMonth(m);
    setDuplicateSource(undefined);
    setMonthFormOpen(true);
  }

  function openDuplicateMonth(m: FinancialPlanMonthResponse) {
    setEditMonth(undefined);
    setDuplicateSource(m);
    setMonthFormOpen(true);
  }

  function handleDeleteMonth(m: FinancialPlanMonthResponse) {
    if (!uuid) return;
    deleteMonth.mutate({ monthUuid: m.id, planUuid: uuid });
  }

  function openAddExpense(monthUuid: string) {
    setEditExpense(undefined);
    setExpenseMonth(monthUuid);
    setExpenseFormOpen(true);
  }

  function openEditExpense(monthUuid: string, expense: FinancialPlanExpenseResponse) {
    setEditExpense(expense);
    setExpenseMonth(monthUuid);
    setExpenseFormOpen(true);
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading plan...</p>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-sm text-destructive">Failed to load plan. Make sure the API is running.</p>
        <Link
          to="/plans"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Plans
        </Link>
      </div>
    );
  }

  const savings = summary ? parseFloat(summary.total_net_surplus) : null;

  // Sort months chronologically
  const sortedMonths = [...plan.monthly_periods].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/plans"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Plans
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold">{plan.plan_name}</h1>
            <p className="text-sm text-muted-foreground">
              {deriveMonthRange(plan.monthly_periods)}
              {plan.monthly_periods.length > 0 && (
                <span className="ml-2">
                  ({plan.monthly_periods.length} month{plan.monthly_periods.length !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditPlanOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletePlanOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Planned Income"
            value={formatCurrency(summary.total_planned_income)}
            icon={DollarSign}
          />
          <StatCard
            title="Total Planned Expenses"
            value={formatCurrency(summary.total_planned_expenses)}
            icon={TrendingDown}
          />
          <StatCard
            title="Projected Savings"
            value={formatCurrency(summary.total_net_surplus)}
            icon={TrendingUp}
            valueClass={savings != null && savings >= 0 ? 'text-green-600' : 'text-destructive'}
          />
        </div>
      )}

      {/* Months header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Months</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkMonthOpen(true)}>
            <Layers className="mr-1 h-3.5 w-3.5" />
            Add Multiple
          </Button>
          <Button size="sm" variant="outline" onClick={openAddMonth}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Month
          </Button>
        </div>
      </div>

      {sortedMonths.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No months added yet. Click "Add Month" or "Add Multiple" to start planning.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map((m) => {
            const totalExpenses = m.expenses.reduce(
              (sum, e) => sum + parseFloat(e.amount),
              0,
            );
            const income = parseFloat(m.planned_income);
            const monthSavings = income - totalExpenses;

            return (
              <Card key={m.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {MONTH_NAMES[m.month]} {m.year}
                      </CardTitle>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>
                          Income:{' '}
                          <span className="font-medium text-foreground tabular-nums">
                            {formatCurrency(m.planned_income)}
                          </span>
                        </span>
                        <span>
                          Expenses:{' '}
                          <span className="font-medium text-foreground tabular-nums">
                            {formatCurrency(totalExpenses.toString())}
                          </span>
                        </span>
                        <span>
                          Savings:{' '}
                          <span
                            className={cn(
                              'font-medium tabular-nums',
                              monthSavings >= 0 ? 'text-green-600' : 'text-destructive',
                            )}
                          >
                            {formatCurrency(monthSavings.toString())}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => openDuplicateMonth(m)}
                        title="Duplicate month"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => openEditMonth(m)}
                        title="Edit month"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMonth(m)}
                        title="Delete month"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {m.expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground mb-3">No expenses yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {m.expenses.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.description}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  e.expense_type === 'recurring'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                                )}
                              >
                                {e.expense_type === 'recurring' ? 'Recurring' : 'One-time'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {e.category_uuid
                                ? getCategoryLabel(e.category_uuid, categoryMap)
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(e.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEditExpense(m.id, e)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteExpenseTarget(e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddExpense(m.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Expense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <PlanFormDialog
        open={editPlanOpen}
        onOpenChange={setEditPlanOpen}
        plan={plan}
      />
      <DeletePlanDialog
        open={deletePlanOpen}
        onOpenChange={setDeletePlanOpen}
        plan={plan}
        onDeleted={() => navigate('/plans')}
      />
      <MonthFormDialog
        open={monthFormOpen}
        onOpenChange={setMonthFormOpen}
        planUuid={uuid ?? ''}
        month={editMonth}
        sourceMonth={duplicateSource}
      />
      <BulkMonthDialog
        open={bulkMonthOpen}
        onOpenChange={setBulkMonthOpen}
        planUuid={uuid ?? ''}
      />
      <ExpenseFormDialog
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        planUuid={uuid ?? ''}
        monthUuid={expenseMonth}
        expense={editExpense}
      />
      <DeleteExpenseDialog
        open={!!deleteExpenseTarget}
        onOpenChange={(o) => { if (!o) setDeleteExpenseTarget(null); }}
        expense={deleteExpenseTarget}
        planUuid={uuid ?? ''}
      />
    </div>
  );
}
