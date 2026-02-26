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
import { useDeleteHolding } from '@/hooks/useInvestments';
import type { InvestmentHoldingResponse } from '@/types/investments';

interface DeleteHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: InvestmentHoldingResponse | null;
}

export function DeleteHoldingDialog({ open, onOpenChange, holding }: DeleteHoldingDialogProps) {
  const del = useDeleteHolding();

  function handleDelete() {
    if (!holding) return;
    del.mutate(
      { uuid: holding.id, accountUuid: holding.account_uuid },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Holding</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the holding{' '}
            <span className="font-medium">{holding?.symbol}</span>? This action cannot be undone.
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
