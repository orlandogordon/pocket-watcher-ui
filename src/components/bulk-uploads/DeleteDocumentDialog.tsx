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
import { useDeleteDocument } from '@/hooks/useBulkUpload';
import type { DocumentResponse } from '@/types/uploads';

interface DeleteDocumentDialogProps {
  document: DocumentResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDocumentDialog({
  document,
  onOpenChange,
}: DeleteDocumentDialogProps) {
  const del = useDeleteDocument();

  const importedCount = document
    ? document.transactions_created + document.investment_transactions_created
    : 0;

  async function handleDelete() {
    if (!document) return;
    await del.mutateAsync(document.document_uuid);
    onOpenChange(false);
  }

  return (
    <AlertDialog open={!!document} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this statement?</AlertDialogTitle>
          <AlertDialogDescription>
            {document && (
              <>
                <span className="font-medium">{document.filename}</span> will be
                permanently removed.
                {importedCount > 0 ? (
                  <>
                    {' '}
                    This will also delete the{' '}
                    <span className="font-medium">
                      {importedCount} transaction{importedCount === 1 ? '' : 's'}
                    </span>{' '}
                    imported from it. This cannot be undone.
                  </>
                ) : (
                  ' This cannot be undone.'
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {del.error && (
          <p className="text-sm text-destructive">{del.error.message}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
