import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLlmHealth } from '@/hooks/useLlmHealth';

/**
 * Proactive AI-enrichment status indicator for the import surfaces (Onboarding
 * wizard + Uploads). Green when online; amber with a heads-up when offline.
 * Purely informational — imports always work with the LLM down (#44/#60).
 */
export function LlmStatusPill({ className }: { className?: string }) {
  const { online, isLoading } = useLlmHealth();

  // Don't flash a state before the first probe resolves.
  if (isLoading || online == null) return null;

  if (online) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700',
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI suggestions: online
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700',
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      AI offline — imports still work, but merchants &amp; categories will need
      manual review.
    </span>
  );
}
