import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowRight, CalendarDays } from 'lucide-react';
import { useFinancialPlans, useFinancialPlanSummary } from '@/hooks/useFinancialPlans';
import { PlanFormDialog } from '@/components/financial-plans/PlanFormDialog';
import { DeletePlanDialog } from '@/components/financial-plans/DeletePlanDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FinancialPlanResponse, FinancialPlanMonthResponse } from '@/types/financial-plans';

const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function deriveMonthRange(months: FinancialPlanMonthResponse[]): string {
  if (months.length === 0) return 'No months';
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

function PlanSummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums font-medium', valueClass)}>{value}</span>
    </div>
  );
}

function PlanCardWithSummary({
  plan,
  onEdit,
  onDelete,
}: {
  plan: FinancialPlanResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: summary } = useFinancialPlanSummary(plan.id);
  const savings = summary ? parseFloat(summary.total_net_surplus) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-base truncate">{plan.plan_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deriveMonthRange(plan.monthly_periods)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{plan.monthly_periods.length} month{plan.monthly_periods.length !== 1 ? 's' : ''}</span>
        </div>

        {summary && (
          <div className="space-y-1 pt-1 border-t">
            <PlanSummaryRow
              label="Total Income"
              value={formatCurrency(summary.total_planned_income)}
            />
            <PlanSummaryRow
              label="Total Expenses"
              value={formatCurrency(summary.total_planned_expenses)}
            />
            <PlanSummaryRow
              label="Projected Savings"
              value={formatCurrency(summary.total_net_surplus)}
              valueClass={savings != null && savings >= 0 ? 'text-green-600' : 'text-destructive'}
            />
          </div>
        )}

        <div className="pt-1">
          <Link
            to={`/plans/${plan.id}`}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            View details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlansPage() {
  const { data: plans, isLoading, isError } = useFinancialPlans();

  const [formOpen, setFormOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<FinancialPlanResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<FinancialPlanResponse | null>(null);

  function openCreate() {
    setEditPlan(undefined);
    setFormOpen(true);
  }

  function openEdit(p: FinancialPlanResponse) {
    setEditPlan(p);
    setFormOpen(true);
  }

  // Sort by earliest month desc, then by created_at desc for plans with no months
  const sorted = [...(plans ?? [])].sort((a, b) => {
    const aFirst = a.monthly_periods.length > 0
      ? a.monthly_periods.reduce((min, m) => {
          const v = m.year * 100 + m.month;
          return v < min ? v : min;
        }, Infinity)
      : 0;
    const bFirst = b.monthly_periods.length > 0
      ? b.monthly_periods.reduce((min, m) => {
          const v = m.year * 100 + m.month;
          return v < min ? v : min;
        }, Infinity)
      : 0;
    if (aFirst !== bFirst) return bFirst - aFirst;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Financial Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-month budget planning with income projections.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load plans. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !sorted.length ? (
        <p className="text-sm text-muted-foreground">
          No financial plans yet. Create one to start planning.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <PlanCardWithSummary
              key={p.id}
              plan={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editPlan}
      />
      <DeletePlanDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        plan={deleteTarget}
      />
    </div>
  );
}
