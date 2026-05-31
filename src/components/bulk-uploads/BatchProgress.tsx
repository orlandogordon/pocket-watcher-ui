import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  Inbox,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBulkBatch, useCancelBatch } from '@/hooks/useBulkUpload';
import { BATCH_TERMINAL, type PerFileStatus } from '@/types/uploads';

const FILE_STATUS_VARIANT: Record<
  PerFileStatus,
  { label: string; cls: string }
> = {
  PENDING: { label: 'Pending', cls: 'bg-muted text-muted-foreground' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Imported', cls: 'bg-green-100 text-green-700' },
  SKIPPED: { label: 'Skipped', cls: 'bg-amber-100 text-amber-700' },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
};

interface BatchProgressProps {
  batchUuid: string;
  onRetryFailed?: (failedDocumentUuids: string[]) => void;
  onDone?: () => void;
}

export function BatchProgress({
  batchUuid,
  onRetryFailed,
  onDone,
}: BatchProgressProps) {
  const { data: batch, isLoading } = useBulkBatch(batchUuid);
  const cancel = useCancelBatch();

  if (isLoading || !batch) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Starting import…
      </div>
    );
  }

  const terminal = BATCH_TERMINAL.includes(batch.status);
  const pct = batch.total > 0 ? Math.round((batch.processed / batch.total) * 100) : 0;
  const failedFiles = batch.per_file.filter((f) => f.status === 'FAILED');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            {batch.status === 'COMPLETED' && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {batch.status === 'FAILED' && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            {batch.status === 'CANCELLED' && (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            {!terminal && <Loader2 className="h-4 w-4 animate-spin" />}
            {terminal
              ? batch.status === 'COMPLETED'
                ? 'Import complete'
                : batch.status === 'CANCELLED'
                  ? 'Import canceled'
                  : 'Import failed'
              : batch.current_filename
                ? `Processing ${batch.current_filename}`
                : 'Processing…'}
          </span>
          <span className="text-muted-foreground">
            {batch.processed} of {batch.total}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!terminal && (
          <p className="text-xs text-muted-foreground">
            Parsing statements can take a few minutes for large batches. You can
            leave this page — the import keeps running.
          </p>
        )}
      </div>

      {terminal && (
        <div className="grid grid-cols-3 gap-3">
          <Summary label="Created" value={batch.created} />
          <Summary label="Skipped" value={batch.skipped} />
          <Summary label="Needs review" value={batch.needs_review} />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Imported</TableHead>
              <TableHead className="text-right">Skipped</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.per_file.map((f) => {
              const v = FILE_STATUS_VARIANT[f.status];
              const imported =
                f.transactions_created + f.investment_transactions_created;
              const skipped =
                f.transactions_skipped + f.investment_transactions_skipped;
              return (
                <TableRow key={f.document_uuid}>
                  <TableCell className="font-medium">
                    <span className="block max-w-[22rem] truncate">{f.filename}</span>
                    {f.error_message && (
                      <span className="text-xs text-destructive">{f.error_message}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={v.cls} variant="secondary">
                      {v.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.status === 'COMPLETED' ? imported : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.status === 'COMPLETED' ? skipped : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!terminal ? (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => cancel.mutate(batchUuid)}
            disabled={cancel.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel import
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {batch.needs_review > 0 && (
              <Button asChild>
                <Link to="/inbox">
                  <Inbox className="mr-2 h-4 w-4" />
                  Review {batch.needs_review} item{batch.needs_review === 1 ? '' : 's'}
                </Link>
              </Button>
            )}
            {failedFiles.length > 0 && onRetryFailed && (
              <Button
                variant="outline"
                onClick={() =>
                  onRetryFailed(failedFiles.map((f) => f.document_uuid))
                }
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Retry {failedFiles.length} failed
              </Button>
            )}
            {onDone && (
              <Button variant="outline" onClick={onDone}>
                Done
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
