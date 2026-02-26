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
import { useDeleteInvestmentTransaction } from '@/hooks/useInvestments';
import type { InvestmentTransactionResponse } from '@/types/investments';

interface DeleteInvestmentTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: InvestmentTransactionResponse | null;
}

export function DeleteInvestmentTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: DeleteInvestmentTransactionDialogProps) {
  const del = useDeleteInvestmentTransaction();

  function handleDelete() {
    if (!transaction) return;
    del.mutate(
      { uuid: transaction.id, accountUuid: transaction.account_uuid },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this investment transaction
            {transaction?.symbol ? ` for ${transaction.symbol}` : ''}? This action cannot be
            undone.
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
