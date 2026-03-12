import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  BudgetTemplateResponse,
  BudgetTemplateCreate,
  BudgetTemplateUpdate,
  BudgetTemplateCategoryCreate,
  BudgetTemplateCategoryUpdate,
  BudgetTemplateCategoryResponse,
  BudgetMonthResponse,
  BudgetMonthAssign,
  BudgetMonthStats,
  BudgetPerformanceItem,
} from '@/types/budgets';

// ── Template queries ──

export function useTemplates() {
  return useQuery({
    queryKey: ['budget-templates'],
    queryFn: () => apiFetch<BudgetTemplateResponse[]>('/budgets/templates/'),
  });
}

export function useTemplate(uuid: string) {
  return useQuery({
    queryKey: ['budget-templates', uuid],
    queryFn: () => apiFetch<BudgetTemplateResponse>(`/budgets/templates/${uuid}`),
    enabled: !!uuid,
  });
}

// ── Template mutations ──

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetTemplateCreate) =>
      apiFetch<BudgetTemplateResponse>('/budgets/templates/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: BudgetTemplateUpdate }) =>
      apiFetch<BudgetTemplateResponse>(`/budgets/templates/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      qc.invalidateQueries({ queryKey: ['budget-months'] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/budgets/templates/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      qc.invalidateQueries({ queryKey: ['budget-months'] });
    },
  });
}

// ── Template category mutations ──

export function useAddTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateUuid, data }: { templateUuid: string; data: BudgetTemplateCategoryCreate }) =>
      apiFetch<BudgetTemplateCategoryResponse>(`/budgets/templates/${templateUuid}/categories/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      qc.invalidateQueries({ queryKey: ['budget-months'] });
    },
  });
}

export function useUpdateTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryUuid, data }: { categoryUuid: string; data: BudgetTemplateCategoryUpdate }) =>
      apiFetch<BudgetTemplateCategoryResponse>(`/budgets/templates/categories/${categoryUuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      qc.invalidateQueries({ queryKey: ['budget-months'] });
    },
  });
}

export function useDeleteTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryUuid: string) =>
      apiFetch<void>(`/budgets/templates/categories/${categoryUuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      qc.invalidateQueries({ queryKey: ['budget-months'] });
    },
  });
}

// ── Month queries ──

export function useBudgetMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['budget-months', year, month],
    queryFn: () => apiFetch<BudgetMonthResponse>(`/budgets/months/${year}/${month}`),
  });
}

export function useBudgetMonths() {
  return useQuery({
    queryKey: ['budget-months'],
    queryFn: () => apiFetch<BudgetMonthResponse[]>('/budgets/months/'),
  });
}

export function useBudgetMonthStats(year: number, month: number) {
  return useQuery({
    queryKey: ['budget-months', year, month, 'stats'],
    queryFn: () => apiFetch<BudgetMonthStats>(`/budgets/months/${year}/${month}/stats`),
  });
}

export function useBudgetMonthPerformance(year: number, month: number) {
  return useQuery({
    queryKey: ['budget-months', year, month, 'performance'],
    queryFn: () => apiFetch<BudgetPerformanceItem[]>(`/budgets/months/${year}/${month}/performance`),
  });
}

// ── Month mutations ──

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, data }: { year: number; month: number; data: BudgetMonthAssign }) =>
      apiFetch<BudgetMonthResponse>(`/budgets/months/${year}/${month}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-months'] }),
  });
}
