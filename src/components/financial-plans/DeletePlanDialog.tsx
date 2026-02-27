import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteFinancialPlan } from '@/hooks/useFinancialPlans';
import type { FinancialPlanResponse } from '@/types/financial-plans';

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: FinancialPlanResponse | null;
  onDeleted?: () => void;
}

export function DeletePlanDialog({ open, onOpenChange, plan, onDeleted }: DeletePlanDialogProps) {
  const deletePlan = useDeleteFinancialPlan();

  function handleDelete() {
    if (!plan) return;
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Plan</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium">{plan?.plan_name}</span>? This will also delete all
            months and expenses in this plan. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deletePlan.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletePlan.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
