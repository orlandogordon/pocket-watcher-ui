import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  FinancialPlanResponse,
  FinancialPlanCreate,
  FinancialPlanUpdate,
  FinancialPlanMonthResponse,
  FinancialPlanMonthCreate,
  FinancialPlanMonthUpdate,
  FinancialPlanExpenseResponse,
  FinancialPlanExpenseCreate,
  FinancialPlanSummary,
} from '@/types/financial-plans';

const planKeys = {
  all: ['financial-plans'] as const,
  detail: (uuid: string) => ['financial-plans', uuid] as const,
  summary: (uuid: string) => ['financial-plans', uuid, 'summary'] as const,
};

export function useFinancialPlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: () => apiFetch<FinancialPlanResponse[]>('/financial_plans/'),
  });
}

export function useFinancialPlan(uuid: string) {
  return useQuery({
    queryKey: planKeys.detail(uuid),
    queryFn: () => apiFetch<FinancialPlanResponse>(`/financial_plans/${uuid}`),
    enabled: !!uuid,
  });
}

export function useFinancialPlanSummary(uuid: string) {
  return useQuery({
    queryKey: planKeys.summary(uuid),
    queryFn: () => apiFetch<FinancialPlanSummary>(`/financial_plans/${uuid}/summary`),
    enabled: !!uuid,
  });
}

export function useCreateFinancialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FinancialPlanCreate) =>
      apiFetch<FinancialPlanResponse>('/financial_plans/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useUpdateFinancialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: FinancialPlanUpdate }) =>
      apiFetch<FinancialPlanResponse>(`/financial_plans/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { uuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.all });
      qc.invalidateQueries({ queryKey: planKeys.detail(uuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(uuid) });
    },
  });
}

export function useDeleteFinancialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/financial_plans/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useBulkCreateMonths() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planUuid, data }: {
      planUuid: string;
      data: FinancialPlanMonthCreate[];
    }) =>
      apiFetch<FinancialPlanMonthResponse[]>(
        `/financial_plans/${planUuid}/months/bulk`,
        { method: 'POST', body: JSON.stringify({ months: data }) },
      ),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useCreatePlanMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planUuid, data }: { planUuid: string; data: FinancialPlanMonthCreate }) =>
      apiFetch<FinancialPlanMonthResponse>(`/financial_plans/${planUuid}/months`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useUpdatePlanMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      monthUuid,
      data,
      planUuid,
    }: {
      monthUuid: string;
      data: FinancialPlanMonthUpdate;
      planUuid: string;
    }) =>
      apiFetch<FinancialPlanMonthResponse>(`/financial_plans/months/${monthUuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useDeletePlanMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ monthUuid, planUuid }: { monthUuid: string; planUuid: string }) =>
      apiFetch<void>(`/financial_plans/months/${monthUuid}`, { method: 'DELETE' }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useCreatePlanExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      monthUuid,
      data,
      planUuid,
    }: {
      monthUuid: string;
      data: FinancialPlanExpenseCreate;
      planUuid: string;
    }) =>
      apiFetch<FinancialPlanExpenseResponse>(`/financial_plans/months/${monthUuid}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useBulkCreateExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      monthUuid,
      data,
      planUuid,
    }: {
      monthUuid: string;
      data: FinancialPlanExpenseCreate[];
      planUuid: string;
    }) =>
      apiFetch<FinancialPlanExpenseResponse[]>(
        `/financial_plans/months/${monthUuid}/expenses/bulk`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useUpdatePlanExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseUuid,
      data,
      planUuid,
    }: {
      expenseUuid: string;
      data: Partial<FinancialPlanExpenseCreate>;
      planUuid: string;
    }) =>
      apiFetch<FinancialPlanExpenseResponse>(`/financial_plans/expenses/${expenseUuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}

export function useDeletePlanExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseUuid, planUuid }: { expenseUuid: string; planUuid: string }) =>
      apiFetch<void>(`/financial_plans/expenses/${expenseUuid}`, { method: 'DELETE' }),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
    },
  });
}
