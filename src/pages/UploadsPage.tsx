import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, History, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadForm } from '@/components/uploads/UploadForm';
import { PreviewSession } from '@/components/uploads/PreviewSession';
import { usePreviewSessions } from '@/hooks/useStatementUpload';
import { INSTITUTION_LABELS } from '@/types/uploads';
import type { ConfirmResponse, PreviewResponse, Institution, PreviewSessionInfo } from '@/types/uploads';

type Step =
  | { kind: 'form' }
  | { kind: 'preview'; sessionId: string }
  | { kind: 'success'; result: ConfirmResponse };

function SuccessBanner({
  result,
  onUploadAnother,
}: {
  result: ConfirmResponse;
  onUploadAnother: () => void;
}) {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Import Complete</h2>
        <p className="text-muted-foreground">
          {result.transactions_created} transaction{result.transactions_created !== 1 ? 's' : ''} imported
          {result.investment_transactions_created > 0 &&
            ` + ${result.investment_transactions_created} investment transaction${result.investment_transactions_created !== 1 ? 's' : ''}`}
          .
        </p>
        <p className="text-xs text-muted-foreground">Job ID: {result.upload_job_id}</p>
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" asChild>
          <Link to="/uploads/history">
            <History className="h-4 w-4 mr-2" />
            View in History
          </Link>
        </Button>
        <Button onClick={onUploadAnother}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Another
        </Button>
      </div>
    </div>
  );
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="text-xs text-destructive">Expired</span>;

  const mins = Math.floor(ms / 60_000);
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  return <span className="text-xs text-muted-foreground">{label} left</span>;
}

function ActiveSessions({ onResume }: { onResume: (sessionId: string) => void }) {
  const { data: sessions, isLoading } = usePreviewSessions();

  if (isLoading || !sessions?.length) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Active Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.preview_session_id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{s.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {INSTITUTION_LABELS[s.institution as Institution] ?? s.institution} · Created{' '}
                  {new Date(s.created_at).toLocaleString()}
                </p>
                {s.summary && (
                  <p className="text-xs text-muted-foreground">
                    {s.summary.ready_to_import} ready · {s.summary.pending_review} pending
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TimeRemaining expiresAt={s.expires_at} />
                <Button size="sm" onClick={() => onResume(s.preview_session_id)}>
                  Resume
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UploadsPage() {
  const [step, setStep] = useState<Step>({ kind: 'form' });

  function handlePreviewReady(preview: PreviewResponse) {
    setStep({ kind: 'preview', sessionId: preview.preview_session_id });
  }

  function handleConfirmed(result: ConfirmResponse) {
    setStep({ kind: 'success', result });
  }

  function handleCancel() {
    setStep({ kind: 'form' });
  }

  return (
    <div className="p-6">
      {step.kind === 'form' && (
        <>
          <ActiveSessions onResume={(id) => setStep({ kind: 'preview', sessionId: id })} />
          <UploadForm onPreviewReady={handlePreviewReady} />
        </>
      )}

      {step.kind === 'preview' && (
        <PreviewSession
          sessionId={step.sessionId}
          onCancel={handleCancel}
          onConfirmed={handleConfirmed}
        />
      )}

      {step.kind === 'success' && (
        <SuccessBanner
          result={step.result}
          onUploadAnother={() => setStep({ kind: 'form' })}
        />
      )}
    </div>
  );
}
