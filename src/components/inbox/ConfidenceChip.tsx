import { CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AttentionConfidence } from '@/types/data-health';

export function ConfidenceChip({ confidence }: { confidence: AttentionConfidence }) {
  if (confidence === 'HIGH') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-green-300 bg-green-50 text-green-700"
        title="Description token confirmed the partner account. Safe to confirm."
      >
        <CheckCheck className="h-3 w-3" />
        Auto-paired
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] border-amber-300 bg-amber-50 text-amber-700"
      title="Amount + date match but no token confirmation — eyeball before confirming."
    >
      Possible match
    </Badge>
  );
}
