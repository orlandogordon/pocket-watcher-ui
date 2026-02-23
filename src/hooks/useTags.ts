import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { TagResponse } from '@/types/transactions';
import type { TagCreate, TagStats } from '@/types/tags';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<TagResponse[]>('/tags/'),
  });
}

export function useTagStats() {
  return useQuery({
    queryKey: ['tags', 'stats'],
    queryFn: () => apiFetch<TagStats[]>('/tags/stats'),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TagCreate) =>
      apiFetch<TagResponse>('/tags/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: TagCreate }) =>
      apiFetch<TagResponse>(`/tags/${uuid}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/tags/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useAddTagToTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transaction_uuid, tag_uuid }: { transaction_uuid: string; tag_uuid: string }) =>
      apiFetch<void>(
        `/tags/transactions/?transaction_uuid=${transaction_uuid}&tag_uuid=${tag_uuid}`,
        { method: 'POST' },
      ),
    onSuccess: (_data, { transaction_uuid }) => {
      qc.invalidateQueries({ queryKey: ['transaction', transaction_uuid] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['tags', 'stats'] });
    },
  });
}

export function useRemoveTagFromTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transaction_uuid, tag_uuid }: { transaction_uuid: string; tag_uuid: string }) =>
      apiFetch<void>(`/tags/transactions/${transaction_uuid}/tags/${tag_uuid}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, { transaction_uuid }) => {
      qc.invalidateQueries({ queryKey: ['transaction', transaction_uuid] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['tags', 'stats'] });
    },
  });
}
