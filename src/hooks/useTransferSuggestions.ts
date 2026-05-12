import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  PairSuggestion,
  TransferTxnRef,
  ConfirmSuggestionRequest,
  ConfirmSuggestionResponse,
  DismissSuggestionRequest,
  DismissSuggestionResponse,
} from '@/types/transfers';

export const transferKeys = {
  suggestions: () => ['transfers', 'suggestions'] as const,
  orphans: () => ['transfers', 'orphans'] as const,
};

export function useTransferSuggestions() {
  return useQuery({
    queryKey: transferKeys.suggestions(),
    queryFn: () => apiFetch<PairSuggestion[]>('/transfers/suggestions'),
  });
}

export function useTransferOrphans() {
  return useQuery({
    queryKey: transferKeys.orphans(),
    queryFn: () => apiFetch<TransferTxnRef[]>('/transfers/orphans'),
  });
}

export function useConfirmTransferSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfirmSuggestionRequest) =>
      apiFetch<ConfirmSuggestionResponse>('/transfers/suggestions/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Suggestion list shrinks; orphans may shrink too if reclassify happened;
      // transactions invalidate because types may have changed.
      qc.invalidateQueries({ queryKey: transferKeys.suggestions() });
      qc.invalidateQueries({ queryKey: transferKeys.orphans() });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDismissTransferSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DismissSuggestionRequest) =>
      apiFetch<DismissSuggestionResponse>('/transfers/suggestions/dismiss', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferKeys.suggestions() });
    },
  });
}
