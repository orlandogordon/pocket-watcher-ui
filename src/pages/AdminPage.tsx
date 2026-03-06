import { useMemo, useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useSnapshotJobs,
  useNeedsReview,
  useRecalculateSnapshots,
  useDismissSnapshotReview,
  useSnapshotAll,
  type SnapshotJob,
} from '@/hooks/useAdmin';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Camera, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AccountResponse } from '@/types/accounts';

// --- Snapshot Actions Section ---

function SnapshotAllButton() {
  const snapshotAll = useSnapshotAll();

  const handleClick = () => {
    const today = new Date().toISOString().split('T')[0];
    snapshotAll.mutate(today);
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={snapshotAll.isPending}>
        <Camera className="mr-2 h-4 w-4" />
        {snapshotAll.isPending ? 'Snapshotting...' : 'Snapshot All Accounts'}
      </Button>
      {snapshotAll.isSuccess && (
        <span className="text-sm text-green-600">
          {snapshotAll.data.message} ({snapshotAll.data.count} accounts, {snapshotAll.data.date})
        </span>
      )}
      {snapshotAll.isError && (
        <span className="text-sm text-destructive">{snapshotAll.error.message}</span>
      )}
    </div>
  );
}

function RecalculateRow({ account }: { account: AccountResponse }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const recalculate = useRecalculateSnapshots();

  const handleSubmit = () => {
    if (!startDate || !endDate) return;
    recalculate.mutate(
      { accountUuid: account.uuid, startDate, endDate },
      { onSuccess: () => { setStartDate(''); setEndDate(''); } }
    );
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium min-w-[180px]">
        {account.account_name}
      </span>
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-40"
        placeholder="Start date"
      />
      <Input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="w-40"
        placeholder="End date"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleSubmit}
        disabled={!startDate || !endDate || recalculate.isPending}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        Recalculate
      </Button>
      {recalculate.isSuccess && (
        <span className="text-xs text-green-600">Job #{recalculate.data.job_id} started</span>
      )}
      {recalculate.isError && (
        <span className="text-xs text-destructive">{recalculate.error.message}</span>
      )}
    </div>
  );
}

function SnapshotActionsSection({ investmentAccounts }: { investmentAccounts: AccountResponse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SnapshotAllButton />
        {investmentAccounts.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recalculate per Account</h4>
            {investmentAccounts.map((acc) => (
              <RecalculateRow key={acc.uuid} account={acc} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Recent Jobs Section ---

function statusBadge(status: SnapshotJob['status']) {
  const variants: Record<SnapshotJob['status'], string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    FAILED: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <Badge variant="outline" className={variants[status]}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

function JobsTable({ accountUuid }: { accountUuid: string }) {
  const { data: jobs, isLoading } = useSnapshotJobs(accountUuid);

  if (!accountUuid) return <p className="text-sm text-muted-foreground">Select an account to view jobs.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading jobs...</p>;
  if (!jobs?.length) return <p className="text-sm text-muted-foreground">No jobs found for this account.</p>;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Snap Created</TableHead>
            <TableHead className="text-right">Snap Updated</TableHead>
            <TableHead className="text-right">Snap Failed</TableHead>
            <TableHead className="text-right">Snap Skipped</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-mono text-xs">{job.id}</TableCell>
              <TableCell>{statusBadge(job.status)}</TableCell>
              <TableCell className="text-sm">
                {job.start_date} → {job.end_date}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(job.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{job.snapshots_created}</TableCell>
              <TableCell className="text-right">{job.snapshots_updated}</TableCell>
              <TableCell className="text-right">{job.snapshots_failed}</TableCell>
              <TableCell className="text-right">{job.snapshots_skipped}</TableCell>
              <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                {job.error_message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentJobsSection({ investmentAccounts }: { investmentAccounts: AccountResponse[] }) {
  const [selectedAccount, setSelectedAccount] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select an investment account" />
          </SelectTrigger>
          <SelectContent>
            {investmentAccounts.map((acc) => (
              <SelectItem key={acc.uuid} value={acc.uuid}>
                {acc.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <JobsTable accountUuid={selectedAccount} />
      </CardContent>
    </Card>
  );
}

// --- Needs Review Section ---

function DismissDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  label: string;
}) {
  const [reason, setReason] = useState('');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dismiss Snapshot</AlertDialogTitle>
          <AlertDialogDescription>{label}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-sm"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              onConfirm(reason);
              setReason('');
            }}
          >
            {isPending ? 'Dismissing...' : 'Dismiss'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NeedsReviewAccount({
  account,
}: {
  account: AccountResponse;
}) {
  const { data: snapshots, isLoading } = useNeedsReview(account.uuid);
  const recalculate = useRecalculateSnapshots();
  const dismiss = useDismissSnapshotReview();
  const [dismissTarget, setDismissTarget] = useState<string[] | null>(null);

  const handleRecalculate = () => {
    if (!snapshots?.length) return;
    const dates = snapshots.map((s) => s.value_date).sort();
    recalculate.mutate({
      accountUuid: account.uuid,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });
  };

  const handleDismissConfirm = (reason: string) => {
    if (!dismissTarget) return;
    dismiss.mutate(
      {
        accountUuid: account.uuid,
        snapshotUuids: dismissTarget,
        reason: reason || undefined,
      },
      { onSuccess: () => setDismissTarget(null) },
    );
  };

  if (isLoading) return null;

  if (!snapshots?.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="font-medium">{account.account_name}</span> — All snapshots look good
      </div>
    );
  }

  const dismissLabel = dismissTarget?.length === 1
    ? `Dismiss snapshot for ${snapshots.find((s) => s.snapshot_uuid === dismissTarget[0])?.value_date ?? 'this date'}?`
    : `Dismiss all ${snapshots.length} flagged snapshots for ${account.account_name}?`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{account.account_name}</span>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            {snapshots.length} to review
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDismissTarget(snapshots.map((s) => s.snapshot_uuid))}
            disabled={dismiss.isPending}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Dismiss All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Recalculate Range
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((s) => (
            <TableRow key={s.snapshot_uuid}>
              <TableCell className="text-sm">{s.value_date}</TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(parseFloat(s.balance))}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.snapshot_source}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.review_reason}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDismissTarget([s.snapshot_uuid])}
                  disabled={dismiss.isPending}
                >
                  Dismiss
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DismissDialog
        open={dismissTarget !== null}
        onOpenChange={(open) => { if (!open) setDismissTarget(null); }}
        onConfirm={handleDismissConfirm}
        isPending={dismiss.isPending}
        label={dismissLabel}
      />
      {recalculate.isSuccess && (
        <p className="text-xs text-green-600">Recalculation job #{recalculate.data.job_id} started</p>
      )}
      {recalculate.isError && (
        <p className="text-xs text-destructive">{recalculate.error.message}</p>
      )}
    </div>
  );
}

function NeedsReviewSection({ investmentAccounts }: { investmentAccounts: AccountResponse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {investmentAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground">No investment accounts found.</p>
        )}
        {investmentAccounts.map((acc) => (
          <NeedsReviewAccount key={acc.uuid} account={acc} />
        ))}
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export function AdminPage() {
  const { data: accounts } = useAccounts();

  const investmentAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.account_type === 'INVESTMENT'),
    [accounts]
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <SnapshotActionsSection investmentAccounts={investmentAccounts} />
      <RecentJobsSection investmentAccounts={investmentAccounts} />
      <NeedsReviewSection investmentAccounts={investmentAccounts} />
    </div>
  );
}
