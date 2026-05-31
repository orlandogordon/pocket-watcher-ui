import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { uploadFile } from '@/hooks/useBulkUpload';
import type { Institution } from '@/types/uploads';

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per-file cap (backend 413)
const DEFAULT_CONCURRENCY = 5; // browser allows ~6 connections/host

export type QueueItemStatus =
  | 'queued'
  | 'uploading'
  | 'done'
  | 'error'
  | 'too_large';

export interface QueueItem {
  id: string;
  file: File;
  accountUuid: string;
  accountName: string;
  institution: Institution;
  status: QueueItemStatus;
  progress: number; // 0..1
  documentUuid?: string;
  error?: string;
}

export interface NewUpload {
  file: File;
  accountUuid: string;
  accountName: string;
  institution: Institution;
}

let counter = 0;
const nextId = () => `u${Date.now()}_${counter++}`;

/**
 * Client-side upload queue: holds per-file rows, uploads them one request at a
 * time throttled to `concurrency`, and tracks per-file progress / retry. The
 * collected `document_uuid`s feed POST /uploads/bulk.
 */
export function useUploadQueue(concurrency = DEFAULT_CONCURRENCY) {
  const [items, setItems] = useState<QueueItem[]>([]);

  // Refs mirror the live state for the async pump (avoids stale closures).
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;
  const activeRef = useRef(0);
  const abortRef = useRef<Map<string, AbortController>>(new Map());
  const runningRef = useRef(false);

  const patch = useCallback((id: string, next: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...next } : it)),
    );
  }, []);

  const uploadOne = useCallback(
    async (item: QueueItem) => {
      const controller = new AbortController();
      abortRef.current.set(item.id, controller);
      patch(item.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        const res = await uploadFile(
          {
            file: item.file,
            accountUuid: item.accountUuid,
            institution: item.institution,
          },
          {
            signal: controller.signal,
            onProgress: (f) => patch(item.id, { progress: f }),
          },
        );
        patch(item.id, {
          status: 'done',
          progress: 1,
          documentUuid: res.document_uuid,
        });
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.status === 413
              ? 'File too large (max 25 MB)'
              : err.message
            : 'Upload failed';
        patch(item.id, { status: 'error', error: msg });
      } finally {
        abortRef.current.delete(item.id);
      }
    },
    [patch],
  );

  // Fill open slots with queued items; resolves when the queue drains.
  const pump = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const launch = (): void => {
      while (activeRef.current < concurrency) {
        const next = itemsRef.current.find((it) => it.status === 'queued');
        if (!next) break;
        // Optimistically mark so the next scan skips it before the next render.
        next.status = 'uploading';
        activeRef.current += 1;
        void uploadOne(next).finally(() => {
          activeRef.current -= 1;
          launch();
        });
      }
      if (activeRef.current === 0) {
        runningRef.current = false;
      }
    };

    launch();
  }, [concurrency, uploadOne]);

  // Drive the queue after each commit, so files added via setState (stale ref
  // at call time) are uploaded once the new state lands. pump() self-guards
  // against re-entry, so frequent progress re-renders are cheap no-ops.
  useEffect(() => {
    if (itemsRef.current.some((it) => it.status === 'queued')) pump();
  }, [items, pump]);

  const add = useCallback((uploads: NewUpload[]) => {
    setItems((prev) => [
      ...prev,
      ...uploads.map<QueueItem>((u) => ({
        id: nextId(),
        file: u.file,
        accountUuid: u.accountUuid,
        accountName: u.accountName,
        institution: u.institution,
        status: u.file.size > MAX_FILE_BYTES ? 'too_large' : 'queued',
        progress: 0,
        error:
          u.file.size > MAX_FILE_BYTES ? 'File too large (max 25 MB)' : undefined,
      })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    abortRef.current.get(id)?.abort();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id && (it.status === 'error' || it.status === 'too_large')
            ? it.file.size > MAX_FILE_BYTES
              ? it
              : { ...it, status: 'queued', error: undefined, progress: 0 }
            : it,
        ),
      );
      void pump();
    },
    [pump],
  );

  const start = useCallback(() => {
    void pump();
  }, [pump]);

  const cancelAll = useCallback(() => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current.clear();
    setItems((prev) =>
      prev.map((it) =>
        it.status === 'uploading' || it.status === 'queued'
          ? { ...it, status: 'error', error: 'Canceled', progress: 0 }
          : it,
      ),
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current.clear();
    activeRef.current = 0;
    runningRef.current = false;
    setItems([]);
  }, []);

  const counts = {
    total: items.length,
    done: items.filter((it) => it.status === 'done').length,
    uploading: items.filter((it) => it.status === 'uploading').length,
    queued: items.filter((it) => it.status === 'queued').length,
    failed: items.filter((it) => it.status === 'error' || it.status === 'too_large')
      .length,
  };
  const documentUuids = items
    .filter((it) => it.status === 'done' && it.documentUuid)
    .map((it) => it.documentUuid as string);

  return {
    items,
    counts,
    documentUuids,
    add,
    remove,
    retry,
    start,
    cancelAll,
    reset,
  };
}
