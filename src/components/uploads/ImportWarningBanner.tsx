import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared amber/yellow "heads-up" banner for non-blocking import signals. Both
 * the LLM-degraded notice (#44) and the statement-reconciliation warning (#49)
 * build on this so they read as one family while staying visually distinct —
 * each independent signal gets its own tone + icon and never collapses into the
 * other.
 */
const TONE = {
  // AI suggestions unavailable (#44).
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  // Statement didn't reconcile to its balance (#49).
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
} as const;

export function ImportWarningBanner({
  icon: Icon,
  tone,
  children,
  className,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-4 py-2 text-sm',
        TONE[tone],
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
