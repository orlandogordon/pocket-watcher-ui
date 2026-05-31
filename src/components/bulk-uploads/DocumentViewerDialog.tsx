import { useEffect, useState } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchDocumentContent } from '@/hooks/useBulkUpload';
import type { DocumentResponse } from '@/types/uploads';

interface DocumentViewerDialogProps {
  document: DocumentResponse | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Loads the original file bytes (with auth) and views them via an object URL —
 * PDFs render inline in an iframe; anything else (CSV) is offered as a download.
 */
export function DocumentViewerDialog({
  document: doc,
  onOpenChange,
}: DocumentViewerDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !!doc && !url && !error;

  const isPdf =
    doc?.content_type?.includes('pdf') ||
    doc?.filename.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (!doc) return;
    let revoked = false;
    let objectUrl: string | null = null;
    fetchDocumentContent(doc.document_uuid)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !revoked && setError('Could not load this file.'));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      setError(null);
    };
  }, [doc]);

  function download() {
    if (!url || !doc) return;
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
  }

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-6">
            <span className="truncate">{doc?.filename}</span>
            <Button size="sm" variant="outline" onClick={download} disabled={!url}>
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : isPdf && url ? (
          <iframe
            src={url}
            title={doc?.filename}
            className="h-[70vh] w-full rounded-md border"
          />
        ) : (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <FileText className="h-10 w-10" />
            <p className="text-sm">
              This file type can't be previewed. Download it to view.
            </p>
            <Button onClick={download} disabled={!url}>
              <Download className="mr-1 h-4 w-4" />
              Download {doc?.filename}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
