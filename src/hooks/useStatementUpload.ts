import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUpload } from '@/lib/api';
import type {
  PreviewResponse,
  ConfirmResponse,
  DuplicateAction,
  BulkDuplicateReviewItem,
  BulkActionResponse,
  PreviewSessionInfo,
  UploadJob,
  SkippedItem,
} from '@/types/uploads';

export const uploadKeys = {
  sessions: () => ['uploads', 'sessions'] as const,
  preview: (id: string) => ['uploads', 'preview', id] as const,
  jobs: () => ['uploads', 'jobs'] as const,
  job: (id: number) => ['uploads', 'jobs', id] as const,
  jobSkipped: (id: number) => ['uploads', 'jobs', id, 'skipped'] as const,
};

export function usePreviewSessions() {
  return useQuery({
    queryKey: uploadKeys.sessions(),
    queryFn: () => apiFetch<PreviewSessionInfo[]>('/uploads/preview/sessions'),
  });
}

export function useUploadStatement() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiUpload<PreviewResponse>('/uploads/statement/preview', formData),
  });
}

export function usePreviewSession(sessionId: string | null) {
  return useQuery({
    queryKey: uploadKeys.preview(sessionId ?? ''),
    queryFn: () => apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}`),
    enabled: !!sessionId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useExtendSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}/extend`),
    onSuccess: (data, sessionId) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<void>(`/uploads/preview/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.sessions() });
    },
  });
}

export function useReviewDuplicate(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tempId, action }: { tempId: string; action: DuplicateAction }) =>
      apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}/review-duplicate`, {
        method: 'POST',
        body: JSON.stringify({ temp_id: tempId, action }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useEditPreviewTransaction(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { temp_id: string; edited_data: Record<string, unknown> }) =>
      apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}/edit-transaction`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.preview(sessionId) });
    },
  });
}

export function useBulkEditPreview(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}/bulk-edit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.preview(sessionId) });
    },
  });
}

export function useRejectUniqueItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tempId: string) =>
      apiFetch<PreviewResponse>(`/uploads/preview/${sessionId}/reject-item`, {
        method: 'POST',
        body: JSON.stringify({ temp_id: tempId }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useBulkReviewDuplicate(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkDuplicateReviewItem[]) =>
      apiFetch<BulkActionResponse>(
        `/uploads/preview/${sessionId}/bulk-review-duplicate`,
        { method: 'POST', body: JSON.stringify({ items }) },
      ),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useBulkRejectItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tempIds: string[]) =>
      apiFetch<BulkActionResponse>(
        `/uploads/preview/${sessionId}/bulk-reject-item`,
        { method: 'POST', body: JSON.stringify({ temp_ids: tempIds }) },
      ),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useConfirmUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<ConfirmResponse>('/uploads/statement/confirm', {
        method: 'POST',
        body: JSON.stringify({ preview_session_id: sessionId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.sessions() });
      qc.invalidateQueries({ queryKey: uploadKeys.jobs() });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUploadJobs() {
  return useQuery({
    queryKey: uploadKeys.jobs(),
    queryFn: () =>
      apiFetch<{ jobs: UploadJob[] }>('/uploads/jobs').then((r) => r.jobs),
  });
}

export function useJobSkipped(jobId: number | null) {
  return useQuery({
    queryKey: uploadKeys.jobSkipped(jobId ?? 0),
    queryFn: () =>
      apiFetch<{ items: SkippedItem[] }>(`/uploads/jobs/${jobId}/skipped`).then(
        (r) => r.items,
      ),
    enabled: jobId !== null,
  });
}
