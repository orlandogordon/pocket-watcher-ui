import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { LlmHealth } from '@/types/uploads';

export const llmHealthKeys = {
  health: () => ['health', 'llm'] as const,
};

/**
 * GET /health/llm — is the AI enrichment service online? The endpoint is
 * server-cached (~60s) and always returns 200, so we poll on a long interval
 * (Approach A, backend #60): probe on mount + refetch on focus, and at most
 * every ~10 min while the page stays open. Deliberately slow — a heads-up
 * signal that must not contend with an in-flight bulk import.
 */
export function useLlmHealth() {
  const query = useQuery({
    queryKey: llmHealthKeys.health(),
    queryFn: () => apiFetch<LlmHealth>('/health/llm'),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    online: query.data?.online ?? null,
    model: query.data?.model ?? null,
    checkedAt: query.data?.checked_at ?? null,
    isLoading: query.isLoading,
  };
}
