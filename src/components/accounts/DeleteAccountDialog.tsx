import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useDeleteAccount } from '@/hooks/useAccounts';
import type { AccountResponse } from '@/types/accounts';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountResponse | null;
}

export function DeleteAccountDialog({ open, onOpenChange, account }: DeleteAccountDialogProps) {
  const [conflictError, setConflictError] = useState(false);
  const deleteAccount = useDeleteAccount();

  function handleDelete() {
    if (!account) return;
    setConflictError(false);
    deleteAccount.mutate(account.uuid, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => {
        if (err.message.toLowerCase().includes('transaction') || err.message.includes('409')) {
          setConflictError(true);
        }
      },
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) setConflictError(false);
    onOpenChange(open);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            {conflictError ? (
              <span className="text-destructive font-medium">
                This account has transactions and cannot be deleted.
              </span>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <span className="font-medium">{account?.account_name}</span>? This action cannot
                be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!conflictError && (
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={handleDelete}
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
