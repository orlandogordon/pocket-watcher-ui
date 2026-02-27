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
import { useDeleteDebtPayment } from '@/hooks/useDebt';
import type { DebtPaymentResponse } from '@/types/debt';

interface DeletePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: DebtPaymentResponse | null;
}

export function DeletePaymentDialog({ open, onOpenChange, payment }: DeletePaymentDialogProps) {
  const del = useDeleteDebtPayment();

  function handleDelete() {
    if (!payment) return;
    del.mutate(
      { uuid: payment.uuid, accountUuid: payment.loan_account_uuid },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this payment? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
