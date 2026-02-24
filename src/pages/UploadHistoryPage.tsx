import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
import { useUploadJobs } from '@/hooks/useStatementUpload';
import { INSTITUTION_LABELS } from '@/types/uploads';
import type { UploadJob, UploadJobStatus } from '@/types/uploads';

function statusBadge(status: UploadJobStatus) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary">{status}</Badge>;
    case 'PROCESSING':
      return <Badge>{status}</Badge>;
    case 'COMPLETED':
      return (
        <Badge variant="outline" className="text-green-700 border-green-400">
          {status}
        </Badge>
      );
    case 'FAILED':
      return <Badge variant="destructive">{status}</Badge>;
  }
}

function institutionLabel(inst: string): string {
  return INSTITUTION_LABELS[inst as keyof typeof INSTITUTION_LABELS] ?? inst;
}

function JobDetailRow({ job }: { job: UploadJob }) {
  const filename = job.file_path
    ? job.file_path.split(/[\\/]/).pop()
    : null;

  const stats: { label: string; value: string | number }[] = [
    { label: 'Transactions imported', value: job.transactions_created ?? 0 },
    { label: 'Transactions skipped', value: job.transactions_skipped ?? 0 },
  ];

  if ((job.investment_transactions_created ?? 0) > 0 || (job.investment_transactions_skipped ?? 0) > 0) {
    stats.push(
      { label: 'Investment txns imported', value: job.investment_transactions_created ?? 0 },
      { label: 'Investment txns skipped', value: job.investment_transactions_skipped ?? 0 },
    );
  }

  if (filename) {
    stats.push({ label: 'File', value: filename });
  }

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={7} className="px-10 py-3">
        <div className="flex flex-wrap gap-x-8 gap-y-1">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-sm font-medium">{s.value}</span>
            </div>
          ))}
        </div>
        {job.error_message && (
          <p className="mt-2 text-xs text-destructive">Error: {job.error_message}</p>
        )}
      </TableCell>
    </TableRow>
  );
}

export function UploadHistoryPage() {
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const { data: jobs, isLoading, error } = useUploadJobs();

  function toggleExpand(jobId: number) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <Link to="/uploads" className="hover:underline">
              ← Back to Uploads
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Upload History</h1>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading upload jobs...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      {!isLoading && !error && (!jobs || jobs.length === 0) && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No upload jobs yet.{' '}
          <Link to="/uploads" className="underline">
            Upload a statement
          </Link>{' '}
          to get started.
        </p>
      )}

      {jobs && jobs.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-44">Created</TableHead>
                <TableHead className="w-44">Completed</TableHead>
                <TableHead className="w-32 text-right">Imported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <Fragment key={job.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(job.id)}>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(job.id); }}
                      >
                        {expandedJobId === job.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">#{job.id}</TableCell>
                    <TableCell className="text-sm">{institutionLabel(job.institution)}</TableCell>
                    <TableCell>{statusBadge(job.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.completed_at ? new Date(job.completed_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {job.transactions_created != null ? (
                        <span>
                          {job.transactions_created}
                          {job.investment_transactions_created
                            ? ` + ${job.investment_transactions_created} inv`
                            : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedJobId === job.id && <JobDetailRow job={job} />}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
