import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { ImportWarningBanner } from './ImportWarningBanner';

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
    <ImportWarningBanner icon={Sparkles} tone="orange" className={className}>
      {children ??
        'AI suggestions unavailable for this import — merchants and categories may need manual review.'}
    </ImportWarningBanner>
  );
}
