import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchBlob, apiUploadWithProgress } from '@/lib/api';
import { uploadKeys } from './useStatementUpload';
import {
  BATCH_TERMINAL,
  type BatchListItem,
  type BulkBatchStatus,
  type BulkKickoffResponse,
  type CancelBatchResponse,
  type DocumentResponse,
  type FileUploadResponse,
} from '@/types/uploads';

export const bulkKeys = {
  batch: (id: string) => ['uploads', 'bulk', id] as const,
  batches: () => ['uploads', 'bulk', 'list'] as const,
  documents: (accountUuid?: string) =>
    ['uploads', 'documents', accountUuid ?? 'all'] as const,
  document: (id: string) => ['uploads', 'documents', 'one', id] as const,
};

/** POST /uploads/files — one file per request, with upload-byte progress. */
export function uploadFile(
  args: {
    file: File;
    accountUuid: string;
    institution: string;
  },
  opts?: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<FileUploadResponse> {
  const fd = new FormData();
  fd.append('file', args.file);
  fd.append('account_uuid', args.accountUuid);
  fd.append('institution', args.institution);
  return apiUploadWithProgress<FileUploadResponse>('/uploads/files', fd, opts);
}

/** POST /uploads/bulk — kick off processing for the uploaded documents. */
export function useBulkKickoff() {
  return useMutation({
    mutationFn: (documentUuids: string[]) =>
      apiFetch<BulkKickoffResponse>('/uploads/bulk', {
        method: 'POST',
        body: JSON.stringify({ document_uuids: documentUuids }),
      }),
  });
}

/** GET /uploads/bulk/{batch_uuid} — polls until the batch reaches a terminal state. */
export function useBulkBatch(batchUuid: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: bulkKeys.batch(batchUuid ?? ''),
    queryFn: () => apiFetch<BulkBatchStatus>(`/uploads/bulk/${batchUuid}`),
    enabled: !!batchUuid,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && BATCH_TERMINAL.includes(status) ? false : 1500;
    },
    refetchOnWindowFocus: false,
  });

  // The poll is the only place batch completion/cancellation is observed (there
  // is no mutation to hang onSuccess on for completion). When it reaches a
  // terminal state the per-statement jobs and documents have settled to their
  // final statuses, so refresh those lists once — the fetch-once history and
  // document-browser views otherwise show stale statuses until a manual reload.
  const status = query.data?.status;
  const settledRef = useRef(false);
  useEffect(() => {
    if (!status) return;
    if (!BATCH_TERMINAL.includes(status)) {
      settledRef.current = false;
      return;
    }
    if (settledRef.current) return;
    settledRef.current = true;
    qc.invalidateQueries({ queryKey: uploadKeys.jobs() });
    qc.invalidateQueries({ queryKey: ['uploads', 'documents'] });
  }, [status, qc]);

  return query;
}

/** GET /uploads/bulk?skip&limit — batch history. */
export function useBulkBatches(params?: { skip?: number; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  return useQuery({
    queryKey: [...bulkKeys.batches(), qs],
    queryFn: () =>
      apiFetch<{ batches: BatchListItem[]; skip: number; limit: number }>(
        `/uploads/bulk${qs ? `?${qs}` : ''}`,
      ).then((r) => r.batches),
  });
}

/** DELETE /uploads/bulk/{batch_uuid} — cancel a pending/in-progress batch. */
export function useCancelBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchUuid: string) =>
      apiFetch<CancelBatchResponse>(`/uploads/bulk/${batchUuid}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, batchUuid) => {
      qc.invalidateQueries({ queryKey: bulkKeys.batch(batchUuid) });
      qc.invalidateQueries({ queryKey: bulkKeys.batches() });
      // The cancel cascades to the per-statement jobs/documents (now CANCELLED),
      // so the fetch-once Upload History and document-browser lists must refresh
      // if they're open rather than showing stale statuses until a reload.
      qc.invalidateQueries({ queryKey: uploadKeys.jobs() });
      qc.invalidateQueries({ queryKey: ['uploads', 'documents'] });
    },
  });
}

/** GET /uploads/documents?account_uuid=… (account optional → all owned). */
export function useDocuments(accountUuid?: string) {
  return useQuery({
    queryKey: bulkKeys.documents(accountUuid),
    queryFn: () =>
      apiFetch<{ documents: DocumentResponse[] }>(
        `/uploads/documents${accountUuid ? `?account_uuid=${accountUuid}` : ''}`,
      ).then((r) => r.documents),
  });
}

/** GET /uploads/documents/{document_uuid}. */
export function useDocument(documentUuid: string | null) {
  return useQuery({
    queryKey: bulkKeys.document(documentUuid ?? ''),
    queryFn: () =>
      apiFetch<DocumentResponse>(`/uploads/documents/${documentUuid}`),
    enabled: !!documentUuid,
  });
}

/** Fetch the original file bytes (with auth) for inline viewing / download. */
export function fetchDocumentContent(documentUuid: string): Promise<Blob> {
  return apiFetchBlob(`/uploads/documents/${documentUuid}/content`);
}

/**
 * DELETE /uploads/documents/{document_uuid} — cascades to the imported
 * transactions. Invalidates documents, transactions, and account stats.
 */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentUuid: string) =>
      apiFetch<void>(`/uploads/documents/${documentUuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uploads', 'documents'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: uploadKeys.jobs() });
    },
  });
}
