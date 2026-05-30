import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteAccount } from '@/hooks/useAccounts';
import { ApiError } from '@/lib/api';
import type { AccountResponse } from '@/types/accounts';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountResponse | null;
}

export function DeleteAccountDialog({ open, onOpenChange, account }: DeleteAccountDialogProps) {
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

  function handleDelete(force = false) {
    if (!account) return;
    setConflictMessage(null);
    deleteAccount.mutate(
      { uuid: account.id, force },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          if (!force && err instanceof ApiError && err.status === 409) {
            setConflictMessage(err.message);
          }
        },
      },
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) setConflictMessage(null);
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {conflictMessage ? (
                <>
                  <p className="text-destructive font-medium">{conflictMessage}</p>
                  <p className="text-sm text-muted-foreground">
                    Force-deleting will permanently remove all transactions, investment holdings,
                    debt plan links, and balance history for this account. Debt payments sourced
                    from this account will have their source cleared, and upload job references
                    will be unlinked.
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-medium">{account?.account_name}</span>? This action cannot
                  be undone.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {conflictMessage ? (
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={() => handleDelete(true)}
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete Account & All Data'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={() => handleDelete(false)}
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
