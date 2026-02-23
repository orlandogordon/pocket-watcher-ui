import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, Copy, ArrowRight } from 'lucide-react';
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetFormDialog } from '@/components/budgets/BudgetFormDialog';
import { DeleteBudgetDialog } from '@/components/budgets/DeleteBudgetDialog';
import { CopyBudgetDialog } from '@/components/budgets/CopyBudgetDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BudgetResponse } from '@/types/budgets';

function formatDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy');
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onCopy,
}: {
  budget: BudgetResponse;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const pct = Math.min(budget.percentage_used, 100);
  const isOverBudget = parseFloat(budget.total_spent) > parseFloat(budget.total_allocated);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-base truncate">{budget.budget_name}</h2>
              {budget.is_active && (
                <Badge variant="default" className="shrink-0 text-xs">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(budget.start_date)} – {formatDate(budget.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCopy} title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </Button>
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
        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className={cn('font-medium', isOverBudget && 'text-destructive')}>
              {formatCurrency(budget.total_spent)} spent
            </span>
            <span className="text-muted-foreground">
              of {formatCurrency(budget.total_allocated)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isOverBudget ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{budget.percentage_used.toFixed(0)}% used</span>
            <span
              className={cn(
                parseFloat(budget.total_remaining) < 0 && 'text-destructive font-medium',
              )}
            >
              {parseFloat(budget.total_remaining) >= 0
                ? `${formatCurrency(budget.total_remaining)} remaining`
                : `${formatCurrency(Math.abs(parseFloat(budget.total_remaining)).toString())} over budget`}
            </span>
          </div>
        </div>

        {/* Category allocations */}
        {budget.budget_categories.length > 0 && (
          <div className="space-y-1 pt-1 border-t">
            {budget.budget_categories.slice(0, 5).map((bc) => (
              <div key={bc.id} className="flex justify-between text-xs">
                <span className="truncate text-muted-foreground">{bc.category.name}</span>
                <span className="shrink-0 ml-2 tabular-nums">
                  {formatCurrency(bc.allocated_amount)}
                </span>
              </div>
            ))}
            {budget.budget_categories.length > 5 && (
              <p className="text-xs text-muted-foreground pt-0.5">
                +{budget.budget_categories.length - 5} more
              </p>
            )}
          </div>
        )}

        {/* Link to detail */}
        <div className="pt-1">
          <Link
            to={`/budgets/${budget.id}`}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            View full breakdown <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetsPage() {
  const { data: budgets, isLoading, isError } = useBudgets();

  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<BudgetResponse | null>(null);
  const [copyTarget, setCopyTarget] = useState<BudgetResponse | null>(null);

  function openCreate() {
    setEditBudget(undefined);
    setFormOpen(true);
  }

  function openEdit(b: BudgetResponse) {
    setEditBudget(b);
    setFormOpen(true);
  }

  // Sort: active first, then by start_date descending
  const sorted = [...(budgets ?? [])].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.start_date.localeCompare(a.start_date);
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track spending against category allocations.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading budgets...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load budgets. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !sorted.length ? (
        <p className="text-sm text-muted-foreground">
          No budgets yet. Create one to start tracking spending.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => openEdit(b)}
              onDelete={() => setDeleteTarget(b)}
              onCopy={() => setCopyTarget(b)}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        budget={editBudget}
      />
      <DeleteBudgetDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        budget={deleteTarget}
      />
      <CopyBudgetDialog
        open={!!copyTarget}
        onOpenChange={(o) => { if (!o) setCopyTarget(null); }}
        budget={copyTarget}
      />
    </div>
  );
}
