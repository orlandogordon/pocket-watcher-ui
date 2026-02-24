const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData });
  // Do NOT set Content-Type — browser sets multipart/form-data with boundary
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? 'Upload failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? 'Request failed');
  }
  // 204 No Content (e.g. DELETE) — return undefined
  if (res.status === 204) return undefined as T;
  return res.json();
}
