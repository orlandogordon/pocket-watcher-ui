import { useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { useUploadStatement } from '@/hooks/useStatementUpload';
import { DEMO_SAMPLES, type DemoSample } from '@/lib/demoSamples';
import type { PreviewResponse } from '@/types/uploads';

interface DemoSampleButtonsProps {
  onPreviewReady: (preview: PreviewResponse) => void;
}

/**
 * Demo-mode upload UI (todo #51). Visitors can't upload their own files — the
 * backend 403s anything outside its sample allowlist — so we offer the bundled
 * samples as one-click "uploads" that run the real preview → categorize → import
 * flow. The bytes are fetched verbatim from `public/demo-samples/` and POSTed
 * unchanged so their sha256 still matches the backend allowlist.
 */
export function DemoSampleButtons({ onPreviewReady }: DemoSampleButtonsProps) {
  const { data: accounts } = useAccounts();
  const upload = useUploadStatement();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTry(sample: DemoSample) {
    setError(null);
    setActiveFile(sample.file);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}demo-samples/${sample.file}`);
      if (!res.ok) throw new Error('Could not load the sample file.');
      const blob = await res.blob();
      // Keep the exact bytes + a text/csv type so the backend hash check passes.
      const file = new File([blob], sample.file, { type: 'text/csv' });

      const formData = new FormData();
      formData.append('institution', sample.institution);
      formData.append('file', file);
      const account = accounts?.find((a) => a.account_type === sample.targetAccountType);
      if (account) formData.append('account_uuid', account.id);

      const preview = await upload.mutateAsync(formData);
      onPreviewReady(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setActiveFile(null);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Try a sample statement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a sample to run the real import flow — uploads are parsed, categorized by
          AI, and previewed before import. (This is a shared demo, so you can&apos;t upload
          your own files.)
        </p>
      </div>

      <div className="space-y-3">
        {DEMO_SAMPLES.map((sample) => {
          const isActive = activeFile === sample.file;
          return (
            <Card key={sample.file}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{sample.label}</p>
                  <p className="text-xs text-muted-foreground">{sample.blurb}</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleTry(sample)}
                  disabled={upload.isPending}
                >
                  {isActive ? (
                    <>
                      <Upload className="h-4 w-4 mr-1.5 animate-pulse" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Try this
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
