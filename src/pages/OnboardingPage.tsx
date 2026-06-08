import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, ArrowLeft, Wallet, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog';
import { AccountDropzone } from '@/components/bulk-uploads/AccountDropzone';
import { FileUploadRow } from '@/components/bulk-uploads/FileUploadRow';
import { BatchProgress } from '@/components/bulk-uploads/BatchProgress';
import { useUploadQueue } from '@/components/bulk-uploads/useUploadQueue';
import { LlmStatusPill } from '@/components/uploads/LlmStatusPill';
import { useAccounts } from '@/hooks/useAccounts';
import { useBulkKickoff, useBulkBatches } from '@/hooks/useBulkUpload';
import {
  BATCH_TERMINAL,
  INSTITUTIONS,
  INSTITUTION_LABELS,
  type Institution,
} from '@/types/uploads';

type Step = 'accounts' | 'files' | 'processing';

// On return to the page, reattach to the newest batch if it's still running, or
// show its summary if it finished within this window (covers "it completed while
// I was away"). Older terminal batches just fall through to the start screen.
const RESUME_WINDOW_MS = 10 * 60 * 1000;

const STEPS: { key: Step; label: string }[] = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'files', label: 'Statements' },
  { key: 'processing', label: 'Import' },
];

// A format group lets one account take statements in more than one parser
// format (e.g. bank PDFs + a Venmo CSV) — each group has its own parser + zone.
interface FormatGroup {
  id: string;
  institution: Institution | '';
}

let groupCounter = 0;
const newGroup = (): FormatGroup => ({
  id: `g${groupCounter++}`,
  institution: '',
});

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useAccounts();
  const queue = useUploadQueue();
  const kickoff = useBulkKickoff();
  // Newest batch only — used to reattach a live/recent import on mount.
  const { data: recentBatches } = useBulkBatches({ limit: 1 });

  const [step, setStep] = useState<Step>('accounts');
  const [formOpen, setFormOpen] = useState(false);
  const [groups, setGroups] = useState<Record<string, FormatGroup[]>>({});
  const [batchUuid, setBatchUuid] = useState<string | null>(null);

  // Reattach to an in-flight (or just-finished) batch when the page loads, so
  // leaving and returning during an import doesn't reset to the start screen.
  // Runs once, after the batch list first resolves.
  const resumeResolved = useRef(false);
  useEffect(() => {
    if (resumeResolved.current || !recentBatches) return;
    resumeResolved.current = true;
    const latest = recentBatches[0];
    if (!latest) return;
    const nonTerminal = !BATCH_TERMINAL.includes(latest.status);
    const recentTerminal =
      !nonTerminal &&
      latest.completed_at != null &&
      Date.now() - new Date(latest.completed_at).getTime() < RESUME_WINDOW_MS;
    if (nonTerminal || recentTerminal) {
      setBatchUuid(latest.batch_uuid);
      setStep('processing');
    }
  }, [recentBatches]);

  const groupsFor = (accountId: string): FormatGroup[] =>
    groups[accountId] ?? [{ id: `${accountId}-0`, institution: '' }];

  // Reads `prev` inside the updater so batched edits don't clobber each other.
  const listIn = (
    prev: Record<string, FormatGroup[]>,
    accountId: string,
  ): FormatGroup[] => prev[accountId] ?? [{ id: `${accountId}-0`, institution: '' }];

  function setGroupInstitution(
    accountId: string,
    groupId: string,
    institution: Institution,
  ) {
    setGroups((prev) => ({
      ...prev,
      [accountId]: listIn(prev, accountId).map((g) =>
        g.id === groupId ? { ...g, institution } : g,
      ),
    }));
  }

  function addGroup(accountId: string) {
    setGroups((prev) => ({
      ...prev,
      [accountId]: [...listIn(prev, accountId), newGroup()],
    }));
  }

  function removeGroup(accountId: string, groupId: string) {
    setGroups((prev) => ({
      ...prev,
      [accountId]: listIn(prev, accountId).filter((g) => g.id !== groupId),
    }));
  }

  const accountList = accounts ?? [];

  const allSettled =
    queue.counts.total > 0 &&
    queue.counts.uploading === 0 &&
    queue.counts.queued === 0;
  const canStartImport = allSettled && queue.documentUuids.length > 0;

  async function startImport(documentUuids: string[]) {
    const res = await kickoff.mutateAsync(documentUuids);
    setBatchUuid(res.batch_uuid);
    setStep('processing');
  }

  function handleRetryFailed(failedDocumentUuids: string[]) {
    if (failedDocumentUuids.length === 0) return;
    // Error is surfaced via kickoff.error in the processing step; swallow the
    // rejection so it doesn't bubble as an unhandled promise rejection.
    void startImport(failedDocumentUuids).catch(() => {});
  }

  // Drop a resumed/finished batch and go back to a clean start.
  function handleStartNew() {
    queue.reset();
    setGroups({});
    setBatchUuid(null);
    setStep('accounts');
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Bring in your history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your accounts, then drop in all your statements at once.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i <= stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${i <= stepIndex ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="ml-2 h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step: accounts */}
      {step === 'accounts' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Your accounts</CardTitle>
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add account
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : accountList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Add the bank, card, and brokerage accounts you want to import.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accountList.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{acc.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.institution_name}
                        </p>
                      </div>
                      <Badge variant="secondary">{acc.account_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                if (accountList.length === 0) {
                  // New user bailing out — don't bounce them straight back here.
                  sessionStorage.setItem('pw_onboarding_skipped', '1');
                  navigate('/');
                } else {
                  navigate('/accounts');
                }
              }}
            >
              {accountList.length === 0 ? 'Skip for now' : 'Back to accounts'}
            </Button>
            <Button
              disabled={accountList.length === 0}
              onClick={() => setStep('files')}
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: files */}
      {step === 'files' && (
        <div className="space-y-4">
          <LlmStatusPill />
          {accountList.map((acc) => {
            const accGroups = groupsFor(acc.id);
            return (
              <Card key={acc.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{acc.account_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {acc.institution_name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accGroups.map((g) => (
                    <div key={g.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={g.institution}
                          onValueChange={(v) =>
                            setGroupInstitution(acc.id, g.id, v as Institution)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Statement format" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTITUTIONS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {INSTITUTION_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {accGroups.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeGroup(acc.id, g.id)}
                            title="Remove format"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccountDropzone
                        disabled={!g.institution}
                        onFiles={(files) => {
                          if (!g.institution) return;
                          queue.add(
                            files.map((file) => ({
                              file,
                              accountUuid: acc.id,
                              accountName: acc.account_name,
                              institution: g.institution as Institution,
                            })),
                          );
                          queue.start();
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addGroup(acc.id)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add another format
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {queue.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Files{' '}
                  <span className="font-normal text-muted-foreground">
                    · {queue.counts.done} of {queue.counts.total} uploaded
                    {queue.counts.failed > 0 && ` · ${queue.counts.failed} failed`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {queue.items.map((item) => (
                  <FileUploadRow
                    key={item.id}
                    item={item}
                    onRetry={queue.retry}
                    onRemove={queue.remove}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep('accounts')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              disabled={!canStartImport || kickoff.isPending}
              onClick={() => startImport(queue.documentUuids)}
            >
              {kickoff.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Import {queue.documentUuids.length} statement
              {queue.documentUuids.length === 1 ? '' : 's'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {kickoff.error && (
            <p className="text-right text-sm text-destructive">
              {kickoff.error.message}
            </p>
          )}
          {queue.counts.total > 0 && !allSettled && (
            <p className="text-right text-xs text-muted-foreground">
              Uploading… you can keep adding files.
            </p>
          )}
        </div>
      )}

      {/* Step: processing */}
      {step === 'processing' && batchUuid && (
        <Card>
          <CardContent className="pt-6">
            <BatchProgress
              batchUuid={batchUuid}
              onRetryFailed={handleRetryFailed}
              onStartNew={handleStartNew}
              onDone={() => navigate('/transactions')}
            />
            {kickoff.error && (
              <p className="mt-3 text-sm text-destructive">
                Retry failed: {kickoff.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
