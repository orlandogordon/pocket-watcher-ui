import { Info } from 'lucide-react';

/**
 * Persistent, unobtrusive banner for the public demo (todo #51). Rendered only
 * in demo mode, at the top of the main content area.
 */
export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>Live demo — shared account, data resets daily.</span>
    </div>
  );
}
