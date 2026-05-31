import { getStoredToken, clearStoredToken } from './auth-storage';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handle401(res: Response): void {
  if (res.status === 401 && getStoredToken()) {
    clearStoredToken();
    window.location.href = '/sign-in';
  }
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers: { ...authHeaders() },
  });
  // Do NOT set Content-Type — browser sets multipart/form-data with boundary
  if (!res.ok) {
    handle401(res);
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(error.detail ?? 'Upload failed', res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Multipart upload over XMLHttpRequest so we can report upload-byte progress
 * (fetch can't) and abort in-flight. Used by the bulk-upload queue, which
 * sends one file per request and shows a per-file progress bar.
 */
export function apiUploadWithProgress<T>(
  path: string,
  formData: FormData,
  opts?: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}${path}`);
    const token = getStoredToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Do NOT set Content-Type — the browser adds the multipart boundary.

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts?.onProgress) {
        opts.onProgress(e.loaded / e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts?.onProgress?.(1);
        if (xhr.status === 204 || !xhr.responseText) {
          resolve(undefined as T);
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError('Malformed response', xhr.status));
        }
        return;
      }
      if (xhr.status === 401 && getStoredToken()) {
        clearStoredToken();
        window.location.href = '/sign-in';
      }
      let detail = xhr.statusText;
      try {
        detail = JSON.parse(xhr.responseText)?.detail ?? detail;
      } catch {
        /* keep statusText */
      }
      reject(new ApiError(detail || 'Upload failed', xhr.status));
    };

    xhr.onerror = () => reject(new ApiError('Network error', 0));
    xhr.onabort = () => reject(new ApiError('Aborted', 0));

    if (opts?.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
      } else {
        opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }
    }

    xhr.send(formData);
  });
}

/**
 * Fetch raw bytes (with auth) as a Blob. Used to view document content inline:
 * the `…/content` endpoint needs a bearer header, which an <iframe>/<embed>
 * src cannot send, so we pull the blob and hand the viewer an object URL.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) {
    handle401(res);
    throw new ApiError('Failed to load file', res.status);
  }
  return res.blob();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    handle401(res);
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(error.detail ?? 'Request failed', res.status);
  }
  // 204 No Content (e.g. DELETE) — return undefined
  if (res.status === 204) return undefined as T;
  return res.json();
}
