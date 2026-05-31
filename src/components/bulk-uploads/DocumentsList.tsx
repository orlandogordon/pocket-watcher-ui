import { useState } from 'react';
import { FileText, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDocuments } from '@/hooks/useBulkUpload';
import { INSTITUTION_LABELS, type Institution } from '@/types/uploads';
import type { DocumentResponse, DocumentStatus } from '@/types/uploads';
import { DocumentViewerDialog } from './DocumentViewerDialog';
import { DeleteDocumentDialog } from './DeleteDocumentDialog';

const STATUS_VARIANT: Record<DocumentStatus, string> = {
  UPLOADED: 'bg-muted text-muted-foreground',
  PENDING: 'bg-muted text-muted-foreground',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

interface DocumentsListProps {
  accountUuid: string;
}

export function DocumentsList({ accountUuid }: DocumentsListProps) {
  const { data: documents, isLoading, isError } = useDocuments(accountUuid);
  const [viewing, setViewing] = useState<DocumentResponse | null>(null);
  const [deleting, setDeleting] = useState<DocumentResponse | null>(null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading documents…</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Failed to load documents.</p>
    );
  }
  if (!documents?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No statements uploaded for this account yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Imported</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const imported =
                doc.transactions_created + doc.investment_transactions_created;
              return (
                <TableRow key={doc.document_uuid}>
                  <TableCell className="font-medium">
                    <button
                      className="flex items-center gap-2 text-left hover:underline"
                      onClick={() => setViewing(doc)}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="max-w-[18rem] truncate">{doc.filename}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    {INSTITUTION_LABELS[doc.institution as Institution] ??
                      doc.institution}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_VARIANT[doc.status]} variant="secondary">
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {imported}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setViewing(doc)}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(doc)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DocumentViewerDialog
        document={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      />
      <DeleteDocumentDialog
        document={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  );
}
