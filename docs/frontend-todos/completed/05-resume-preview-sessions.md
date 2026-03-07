# 05 — Resume Preview Sessions

## Background

Backend item 3.6 added `GET /uploads/preview/sessions` which returns all active
(non-expired) preview sessions for the current user with metadata: `preview_session_id`,
`institution`, `filename`, `created_at`, `expires_at`, and `summary`.

The uploads page should show a "Resume session" list above the upload form when
active sessions exist.

## Current Code

### `src/pages/UploadsPage.tsx`

Simple 3-step state machine: `form` -> `preview` -> `success`. The `form` step
renders `<UploadForm>` with no awareness of existing sessions.

### `src/hooks/useStatementUpload.ts`

No hook for listing sessions.

## Changes Required

### 1. Add types in `src/types/uploads.ts`

```ts
export interface PreviewSessionInfo {
  preview_session_id: string;
  institution: string;
  filename: string;
  created_at: string;
  expires_at: string;
  summary: PreviewSummary | null;
}
```

### 2. Add query hook in `src/hooks/useStatementUpload.ts`

```ts
export function usePreviewSessions() {
  return useQuery({
    queryKey: ['uploads', 'sessions'] as const,
    queryFn: () => apiFetch<PreviewSessionInfo[]>('/uploads/preview/sessions'),
  });
}
```

### 3. Update `src/pages/UploadsPage.tsx`

When `step.kind === 'form'`, render a sessions list above `<UploadForm>`:

```tsx
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
            <div key={s.preview_session_id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{s.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {INSTITUTION_LABELS[s.institution]} · Created{' '}
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
```

Add a `TimeRemaining` component showing relative expiry (e.g. "12 min left").

Wire the resume action to transition to the preview step:
```tsx
function handleResume(sessionId: string) {
  setStep({ kind: 'preview', sessionId });
}
```

Render inside the form step:
```tsx
{step.kind === 'form' && (
  <>
    <ActiveSessions onResume={handleResume} />
    <UploadForm onPreviewReady={handlePreviewReady} />
  </>
)}
```

### 4. Invalidate sessions list

When a session is confirmed or cancelled, invalidate `['uploads', 'sessions']` so the
list refreshes. Add to `useConfirmUpload` and `useCancelSession` onSuccess callbacks.

## Verify

- Upload a statement -> cancel -> sessions list shows the session
- Click "Resume" -> enters preview step with that session
- Confirm a session -> sessions list no longer shows it
- Expired sessions don't appear
- No sessions -> no "Active Sessions" card shown

## Files Changed

- `src/types/uploads.ts` — `PreviewSessionInfo` type
- `src/hooks/useStatementUpload.ts` — `usePreviewSessions` hook + invalidation
- `src/pages/UploadsPage.tsx` — `ActiveSessions` component + resume handler

## Estimated Scope

~60 lines new code across 3 files.
