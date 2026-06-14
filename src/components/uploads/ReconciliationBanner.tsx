import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatSignedCurrency } from '@/lib/format';
import { ImportWarningBanner } from './ImportWarningBanner';

/**
 * Yellow "this statement didn't balance" notice — non-blocking heads-up that a
 * statement's parsed rows didn't reconcile to its begin/end balance, so a row
 * was likely dropped or duplicated during parsing (frontend todo #49 / backend
 * #78). Distinct from {@link LlmDegradedBanner}: a statement can be both
 * degraded and unreconciled, so they stay separate signals.
 *
 * Pass `delta` (string Decimal off-by amount) for the default single-statement
 * copy, or `children` to override (e.g. the batch-level multi-statement notice).
 */
export function ReconciliationBanner({
  delta,
  children,
  className,
}: {
  delta?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <ImportWarningBanner icon={AlertTriangle} tone="yellow" className={className}>
      {children ?? (
        <>
          This statement didn&rsquo;t balance — off by{' '}
          <span className="font-medium">
            {formatSignedCurrency(delta ?? '0')}
          </span>
          . The rows still imported; re-check this statement.
        </>
      )}
    </ImportWarningBanner>
  );
}
