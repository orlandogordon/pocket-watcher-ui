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
