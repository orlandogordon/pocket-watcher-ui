import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CategoryResponse } from '@/types/categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryResponse[]>('/categories/'),
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
