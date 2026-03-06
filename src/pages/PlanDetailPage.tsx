import React, { useState, useCallback, type KeyboardEvent } from 'react';
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
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import {
  useFinancialPlan,
  useFinancialPlanSummary,
  useDeletePlanMonth,
  useUpdatePlanMonth,
  useUpdatePlanExpense,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ExpenseType,
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

interface ExpenseDraft {
  description: string;
  amount: string;
  expense_type: ExpenseType;
  category_uuid: string;
}

export function PlanDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = useFinancialPlan(uuid ?? '');
  const { data: summary } = useFinancialPlanSummary(uuid ?? '');
  const { data: categories } = useCategories();
  const categoryMap = buildCategoryMap(categories ?? []);
  const deleteMonth = useDeletePlanMonth();
  const updateMonth = useUpdatePlanMonth();
  const updateExpense = useUpdatePlanExpense();

  // Expand/collapse state
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Inline edit state — month
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editingMonthDraft, setEditingMonthDraft] = useState({ planned_income: '' });

  // Inline edit state — expense
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseDraft, setEditingExpenseDraft] = useState<ExpenseDraft>({
    description: '',
    amount: '',
    expense_type: 'recurring',
    category_uuid: '',
  });

  // Dialog state
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [monthFormOpen, setMonthFormOpen] = useState(false);
  const [editMonthDialog, setEditMonthDialog] = useState<FinancialPlanMonthResponse | undefined>();
  const [duplicateSource, setDuplicateSource] = useState<FinancialPlanMonthResponse | undefined>();
  const [bulkMonthOpen, setBulkMonthOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseMonth, setExpenseMonth] = useState<string>('');
  const [editExpenseDialog, setEditExpenseDialog] = useState<FinancialPlanExpenseResponse | undefined>();
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<FinancialPlanExpenseResponse | null>(null);

  const toggleExpand = useCallback((monthId: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthId)) next.delete(monthId);
      else next.add(monthId);
      return next;
    });
  }, []);

  // Start editing a month's income
  function startEditMonth(m: FinancialPlanMonthResponse) {
    setEditingExpenseId(null);
    setEditingMonthId(m.id);
    setEditingMonthDraft({ planned_income: m.planned_income });
  }

  function cancelEditMonth() {
    setEditingMonthId(null);
  }

  function confirmEditMonth() {
    if (!editingMonthId || !uuid) return;
    updateMonth.mutate(
      { monthUuid: editingMonthId, planUuid: uuid, data: { planned_income: editingMonthDraft.planned_income } },
      { onSuccess: () => setEditingMonthId(null) },
    );
  }

  // Start editing an expense
  function startEditExpense(e: FinancialPlanExpenseResponse) {
    setEditingMonthId(null);
    setEditingExpenseId(e.id);
    setEditingExpenseDraft({
      description: e.description,
      amount: e.amount,
      expense_type: e.expense_type,
      category_uuid: e.category_uuid ?? '',
    });
  }

  function cancelEditExpense() {
    setEditingExpenseId(null);
  }

  function confirmEditExpense() {
    if (!editingExpenseId || !uuid) return;
    updateExpense.mutate(
      {
        expenseUuid: editingExpenseId,
        planUuid: uuid,
        data: {
          description: editingExpenseDraft.description,
          amount: editingExpenseDraft.amount,
          expense_type: editingExpenseDraft.expense_type,
          category_uuid: editingExpenseDraft.category_uuid || undefined,
        },
      },
      { onSuccess: () => setEditingExpenseId(null) },
    );
  }

  function openDuplicateMonth(m: FinancialPlanMonthResponse) {
    setEditMonthDialog(undefined);
    setDuplicateSource(m);
    setMonthFormOpen(true);
  }

  function handleDeleteMonth(m: FinancialPlanMonthResponse) {
    if (!uuid) return;
    deleteMonth.mutate({ monthUuid: m.id, planUuid: uuid });
  }

  function openAddExpense(monthUuid: string) {
    setEditExpenseDialog(undefined);
    setExpenseMonth(monthUuid);
    setExpenseFormOpen(true);
  }

  function openAddMonth() {
    setEditMonthDialog(undefined);
    setDuplicateSource(undefined);
    setMonthFormOpen(true);
  }

  // Keyboard handlers
  function onMonthKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); confirmEditMonth(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEditMonth(); }
  }

  function onExpenseKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); confirmEditExpense(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEditExpense(); }
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Planned Income</TableHead>
                <TableHead className="text-right">Total Expenses</TableHead>
                <TableHead className="text-right">Net Surplus</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMonths.map((m) => {
                const totalExpenses = m.expenses.reduce(
                  (sum, e) => sum + parseFloat(e.amount),
                  0,
                );
                const income = parseFloat(m.planned_income);
                const net = income - totalExpenses;
                const isExpanded = expandedMonths.has(m.id);
                const isEditingThis = editingMonthId === m.id;

                return (
                  <React.Fragment key={m.id}>
                    <TableRow className="group">
                      {/* Chevron */}
                      <TableCell className="px-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => toggleExpand(m.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>

                      {/* Month label */}
                      <TableCell className="font-medium">
                        {MONTH_NAMES[m.month]} {m.year}
                      </TableCell>

                      {/* Planned Income — inline editable */}
                      <TableCell className="text-right">
                        {isEditingThis ? (
                          <Input
                            autoFocus
                            type="number"
                            step="0.01"
                            className="h-8 w-32 ml-auto text-right tabular-nums"
                            value={editingMonthDraft.planned_income}
                            onChange={(e) =>
                              setEditingMonthDraft({ planned_income: e.target.value })
                            }
                            onKeyDown={onMonthKeyDown}
                          />
                        ) : (
                          <span
                            className="tabular-nums cursor-pointer hover:underline"
                            onClick={() => startEditMonth(m)}
                          >
                            {formatCurrency(m.planned_income)}
                          </span>
                        )}
                      </TableCell>

                      {/* Total Expenses */}
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(totalExpenses.toString())}
                      </TableCell>

                      {/* Net Surplus */}
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          net >= 0 ? 'text-green-600' : 'text-destructive',
                        )}
                      >
                        {formatCurrency(net.toString())}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {isEditingThis ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                onClick={confirmEditMonth}
                                disabled={updateMonth.isPending}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={cancelEditMonth}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openDuplicateMonth(m)}
                                title="Duplicate month"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteMonth(m)}
                                title="Delete month"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded expense sub-table */}
                    {isExpanded && (
                      <TableRow key={`${m.id}-expenses`} className="hover:bg-transparent">
                        <TableCell colSpan={6} className="p-0">
                          <div className="bg-muted/30 px-6 py-3 border-t">
                            {m.expenses.length === 0 ? (
                              <p className="text-sm text-muted-foreground mb-3">No expenses yet.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[100px]" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {m.expenses.map((e) => {
                                    const isEditingExp = editingExpenseId === e.id;

                                    return (
                                      <TableRow key={e.id}>
                                        {/* Description */}
                                        <TableCell>
                                          {isEditingExp ? (
                                            <Input
                                              autoFocus
                                              className="h-8"
                                              value={editingExpenseDraft.description}
                                              onChange={(ev) =>
                                                setEditingExpenseDraft((d) => ({
                                                  ...d,
                                                  description: ev.target.value,
                                                }))
                                              }
                                              onKeyDown={onExpenseKeyDown}
                                            />
                                          ) : (
                                            <span
                                              className="font-medium cursor-pointer hover:underline"
                                              onClick={() => startEditExpense(e)}
                                            >
                                              {e.description}
                                            </span>
                                          )}
                                        </TableCell>

                                        {/* Category */}
                                        <TableCell>
                                          {isEditingExp ? (
                                            <Select
                                              value={editingExpenseDraft.category_uuid}
                                              onValueChange={(v) =>
                                                setEditingExpenseDraft((d) => ({
                                                  ...d,
                                                  category_uuid: v === '__none__' ? '' : v,
                                                }))
                                              }
                                            >
                                              <SelectTrigger className="h-8 w-[180px]">
                                                <SelectValue placeholder="None" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">None</SelectItem>
                                                {(categories ?? []).map((c) => (
                                                  <SelectItem key={c.id} value={c.id}>
                                                    {getCategoryLabel(c.id, categoryMap)}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <span
                                              className="text-muted-foreground cursor-pointer hover:underline"
                                              onClick={() => startEditExpense(e)}
                                            >
                                              {e.category_uuid
                                                ? getCategoryLabel(e.category_uuid, categoryMap)
                                                : '—'}
                                            </span>
                                          )}
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell>
                                          {isEditingExp ? (
                                            <Select
                                              value={editingExpenseDraft.expense_type}
                                              onValueChange={(v) =>
                                                setEditingExpenseDraft((d) => ({
                                                  ...d,
                                                  expense_type: v as ExpenseType,
                                                }))
                                              }
                                            >
                                              <SelectTrigger className="h-8 w-[130px]">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="recurring">Recurring</SelectItem>
                                                <SelectItem value="one_time">One-time</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <span
                                              className="cursor-pointer"
                                              onClick={() => startEditExpense(e)}
                                            >
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
                                            </span>
                                          )}
                                        </TableCell>

                                        {/* Amount */}
                                        <TableCell className="text-right">
                                          {isEditingExp ? (
                                            <Input
                                              type="number"
                                              step="0.01"
                                              className="h-8 w-28 ml-auto text-right tabular-nums"
                                              value={editingExpenseDraft.amount}
                                              onChange={(ev) =>
                                                setEditingExpenseDraft((d) => ({
                                                  ...d,
                                                  amount: ev.target.value,
                                                }))
                                              }
                                              onKeyDown={onExpenseKeyDown}
                                            />
                                          ) : (
                                            <span
                                              className="tabular-nums cursor-pointer hover:underline"
                                              onClick={() => startEditExpense(e)}
                                            >
                                              {formatCurrency(e.amount)}
                                            </span>
                                          )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell>
                                          <div className="flex items-center gap-1 justify-end">
                                            {isEditingExp ? (
                                              <>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                                  onClick={confirmEditExpense}
                                                  disabled={updateExpense.isPending}
                                                >
                                                  <Check className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                                  onClick={cancelEditExpense}
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </Button>
                                              </>
                                            ) : (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteExpenseTarget(e)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
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
        month={editMonthDialog}
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
        expense={editExpenseDialog}
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
