import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CategoryResponse, CategoryCreate } from '@/types/categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryResponse[]>('/categories/'),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) =>
      apiFetch<CategoryResponse>('/categories/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: CategoryCreate }) =>
      apiFetch<CategoryResponse>(`/categories/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, force }: { uuid: string; force?: boolean }) =>
      apiFetch<void>(`/categories/${uuid}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function buildCategoryMap(categories: CategoryResponse[]): Map<string, CategoryResponse> {
  const map = new Map<string, CategoryResponse>();
  for (const cat of categories) {
    map.set(cat.id, cat);
  }
  return map;
}

export function getCategoryLabel(
  uuid: string,
  map: Map<string, CategoryResponse>
): string {
  const cat = map.get(uuid);
  if (!cat) return '—';
  if (cat.parent_category_uuid) {
    const parent = map.get(cat.parent_category_uuid);
    if (parent) return `${parent.name} > ${cat.name}`;
  }
  return cat.name;
}
