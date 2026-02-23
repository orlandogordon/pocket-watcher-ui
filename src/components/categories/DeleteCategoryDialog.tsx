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
import { useDeleteCategory } from '@/hooks/useCategories';
import type { CategoryResponse } from '@/types/categories';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse | null;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
}: DeleteCategoryDialogProps) {
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const deleteCategory = useDeleteCategory();

  function handleDelete(force = false) {
    if (!category) return;
    setConflictMessage(null);
    deleteCategory.mutate(
      { uuid: category.id, force },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          setConflictMessage(err.message);
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
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {conflictMessage ? (
                <>
                  <p className="text-destructive font-medium">{conflictMessage}</p>
                  <p className="text-sm text-muted-foreground">
                    Force-deleting will remove this category from all budgets and clear it
                    from any transactions.
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-medium">{category?.name}</span>? This action cannot be
                  undone.
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
              disabled={deleteCategory.isPending}
              onClick={() => handleDelete(true)}
            >
              {deleteCategory.isPending ? 'Deleting...' : 'Force Delete'}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              disabled={deleteCategory.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
