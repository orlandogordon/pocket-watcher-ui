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
import { useDeleteTag } from '@/hooks/useTags';
import type { TagResponse } from '@/types/transactions';

interface DeleteTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: TagResponse | null;
  transactionCount?: number;
}

export function DeleteTagDialog({ open, onOpenChange, tag, transactionCount = 0 }: DeleteTagDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const deleteTag = useDeleteTag();
  const hasTransactions = transactionCount > 0;

  function handleDelete() {
    if (!tag) return;
    if (hasTransactions && !confirmed) {
      setConfirmed(true);
      return;
    }
    deleteTag.mutate(tag.id, { onSuccess: () => onOpenChange(false) });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmed(false);
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {confirmed ? (
                <>
                  <p className="text-destructive font-medium">
                    This tag is used by {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}. It will be removed from all of them.
                  </p>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </>
              ) : (
                <p>
                  Are you sure you want to delete the tag{' '}
                  <span className="font-medium">{tag?.tag_name}</span>? This action cannot be undone.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteTag.isPending}
            onClick={handleDelete}
          >
            {deleteTag.isPending ? 'Deleting...' : confirmed ? 'Delete & Remove from Transactions' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
