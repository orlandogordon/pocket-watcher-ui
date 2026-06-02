import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Amber "AI suggestions were unavailable" notice, shared across the single-file
 * preview, the bulk batch progress, and anywhere a degraded import surfaces so
 * the three read as one signal (frontend todo #44 / backend #60).
 */
export function LlmDegradedBanner({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700',
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span>
        {children ??
          'AI suggestions unavailable for this import — merchants and categories may need manual review.'}
      </span>
    </div>
  );
}
