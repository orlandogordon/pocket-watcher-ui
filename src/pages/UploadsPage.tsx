import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, History, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadForm } from '@/components/uploads/UploadForm';
import { PreviewSession } from '@/components/uploads/PreviewSession';
import type { ConfirmResponse, PreviewResponse } from '@/types/uploads';

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
        <UploadForm onPreviewReady={handlePreviewReady} />
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
