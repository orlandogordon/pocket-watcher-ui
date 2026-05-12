import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useTransferSuggestions,
  useTransferOrphans,
  useConfirmTransferSuggestion,
  useDismissTransferSuggestion,
} from '@/hooks/useTransferSuggestions';
import { formatCurrency, formatTypeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PairSuggestion, TransferTxnRef } from '@/types/transfers';

// Reclassify is only honored for regular transactions on the backend.
// For each side we treat it as needed when the row isn't yet typed as a
// transfer; investment sides can never have it on regardless.
function canReclassify(side: TransferTxnRef): boolean {
  if (side.is_investment) return false;
  return side.transaction_type !== 'TRANSFER_OUT' && side.transaction_type !== 'TRANSFER_IN';
}

function describeOffset(days: number, outAccount: string | null, inAccount: string | null): string {
  if (days === 0) return 'Same date.';
  const abs = Math.abs(days);
  const dayWord = abs === 1 ? 'day' : 'days';
  if (days < 0) {
    return `${inAccount ?? 'Inbound'} posted ${abs} ${dayWord} before ${outAccount ?? 'outbound'}.`;
  }
  return `${inAccount ?? 'Inbound'} posted ${abs} ${dayWord} after ${outAccount ?? 'outbound'}.`;
}

function ConfidenceChip({ confidence }: { confidence: 'HIGH' | 'MEDIUM' }) {
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

function SideBlock({
  side,
  label,
  reclassify,
  onToggleReclassify,
  disabled,
}: {
  side: TransferTxnRef;
  label: 'Out' | 'In';
  reclassify: boolean;
  onToggleReclassify: (next: boolean) => void;
  disabled: boolean;
}) {
  const reclassifyAllowed = canReclassify(side);
  const targetType = label === 'Out' ? 'TRANSFER_OUT' : 'TRANSFER_IN';
  const accent = label === 'Out' ? 'text-red-600' : 'text-green-700';
  const Arrow = label === 'Out' ? ArrowUp : ArrowDown;

  return (
    <div className="flex-1 min-w-0 space-y-1">
      <div className="flex items-center gap-1.5">
        <Arrow className={cn('h-3.5 w-3.5 shrink-0', accent)} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {formatTypeLabel(side.transaction_type)}
        </Badge>
        {side.is_investment && (
          <Badge variant="outline" className="text-[10px]">
            Investment
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium truncate" title={side.description ?? ''}>
        {side.description ?? '—'}
      </p>
      <p className="text-xs text-muted-foreground">
        {side.account_name ?? '—'} · {format(parseISO(side.transaction_date), 'MMM d, yyyy')} ·{' '}
        <span className={cn('font-medium tabular-nums', accent)}>
          {formatCurrency(side.amount)}
        </span>
      </p>
      {reclassifyAllowed && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={reclassify}
            onCheckedChange={(v) => onToggleReclassify(v === true)}
            disabled={disabled}
          />
          <span>
            Reclassify {formatTypeLabel(side.transaction_type)} → {formatTypeLabel(targetType)}
          </span>
        </label>
      )}
    </div>
  );
}

function SuggestionRow({ suggestion }: { suggestion: PairSuggestion }) {
  const confirmMut = useConfirmTransferSuggestion();
  const dismissMut = useDismissTransferSuggestion();

  // Default reclassify toggles to true whenever a side isn't yet a transfer
  // type — the common case is that confirming should flip the bank-side
  // PURCHASE/CREDIT into the proper transfer type. User can opt out per side.
  const [reclassifyFrom, setReclassifyFrom] = useState(canReclassify(suggestion.out_side));
  const [reclassifyTo, setReclassifyTo] = useState(canReclassify(suggestion.in_side));

  const isPending = confirmMut.isPending || dismissMut.isPending;
  const error = confirmMut.error ?? dismissMut.error;

  function handleConfirm() {
    confirmMut.mutate({
      from_transaction_uuid: suggestion.out_side.id,
      to_transaction_uuid: suggestion.in_side.id,
      reclassify_from: reclassifyFrom,
      reclassify_to: reclassifyTo,
    });
  }

  function handleDismiss() {
    dismissMut.mutate({
      from_transaction_uuid: suggestion.out_side.id,
      to_transaction_uuid: suggestion.in_side.id,
    });
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ConfidenceChip confidence={suggestion.confidence} />
        <span className="text-xs text-muted-foreground">
          {describeOffset(
            suggestion.date_offset_days,
            suggestion.out_side.account_name,
            suggestion.in_side.account_name,
          )}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <SideBlock
          side={suggestion.out_side}
          label="Out"
          reclassify={reclassifyFrom}
          onToggleReclassify={setReclassifyFrom}
          disabled={isPending}
        />
        <ArrowRight className="h-4 w-4 mt-6 shrink-0 text-muted-foreground" />
        <SideBlock
          side={suggestion.in_side}
          label="In"
          reclassify={reclassifyTo}
          onToggleReclassify={setReclassifyTo}
          disabled={isPending}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isPending}
        >
          {dismissMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5 mr-1" />
          )}
          Not a match
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={isPending}>
          {confirmMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          Confirm pair
        </Button>
      </div>
    </div>
  );
}

function OrphanRow({
  orphan,
  onEdit,
}: {
  orphan: TransferTxnRef;
  onEdit?: (txId: string, isInvestment: boolean) => void;
}) {
  const isOut = orphan.transaction_type === 'TRANSFER_OUT';
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {isOut ? (
          <ArrowUp className="h-3.5 w-3.5 text-red-600 shrink-0" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-green-700 shrink-0" />
        )}
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {formatTypeLabel(orphan.transaction_type)}
        </Badge>
        {orphan.is_investment && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            Investment
          </Badge>
        )}
        <span className="text-sm truncate" title={orphan.description ?? ''}>
          {orphan.description ?? '—'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span className="truncate max-w-[160px]">{orphan.account_name ?? '—'}</span>
        <span>{format(parseISO(orphan.transaction_date), 'MMM d, yyyy')}</span>
        <span className="font-medium tabular-nums">{formatCurrency(orphan.amount)}</span>
        {onEdit && !orphan.is_investment && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => onEdit(orphan.id, orphan.is_investment)}
            title="Edit this transaction (e.g. reclassify if it isn't really a transfer)"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

interface TransferSuggestionsCardProps {
  onEditOrphan?: (txId: string, isInvestment: boolean) => void;
}

export function TransferSuggestionsCard({ onEditOrphan }: TransferSuggestionsCardProps = {}) {
  const { data: suggestions } = useTransferSuggestions();
  const { data: orphans } = useTransferOrphans();
  const confirmMut = useConfirmTransferSuggestion();

  const sList = suggestions ?? [];
  const oList = orphans ?? [];

  // Collapse the orphan list by default — usually informational + can be long.
  const [orphansOpen, setOrphansOpen] = useState(false);
  // Dismiss is mount-scoped on purpose: a page reload should resurface the
  // card so users don't permanently lose track of pending suggestions.
  const [dismissed, setDismissed] = useState(false);

  if (sList.length === 0 && oList.length === 0) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  const highConfidence = sList.filter((s) => s.confidence === 'HIGH');
  const mediumConfidence = sList.filter((s) => s.confidence === 'MEDIUM');

  function confirmAllHigh() {
    // Fire each confirm sequentially-via-promise; the hook invalidates on
    // success so the list trims as they resolve. Reclassify defaults match
    // the per-row defaults (auto-reclassify when the side isn't yet a
    // transfer type).
    for (const s of highConfidence) {
      confirmMut.mutate({
        from_transaction_uuid: s.out_side.id,
        to_transaction_uuid: s.in_side.id,
        reclassify_from: canReclassify(s.out_side),
        reclassify_to: canReclassify(s.in_side),
      });
    }
  }

  return (
    <Card className="border-amber-200/60 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span>Transfers needing attention</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-muted-foreground">
              {sList.length > 0 && `${sList.length} suggested`}
              {sList.length > 0 && oList.length > 0 && ' · '}
              {oList.length > 0 && `${oList.length} orphan${oList.length === 1 ? '' : 's'}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
              title="Hide until next page load"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {sList.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Suggested pairs <span className="text-muted-foreground">({sList.length})</span>
              </h3>
              {highConfidence.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={confirmAllHigh}
                  disabled={confirmMut.isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Confirm all {highConfidence.length} auto-paired
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {highConfidence.map((s) => (
                <SuggestionRow key={`${s.out_side.id}-${s.in_side.id}`} suggestion={s} />
              ))}
              {mediumConfidence.map((s) => (
                <SuggestionRow key={`${s.out_side.id}-${s.in_side.id}`} suggestion={s} />
              ))}
            </div>
          </section>
        )}

        {oList.length > 0 && (
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setOrphansOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="text-sm font-medium">
                  Orphan transfers{' '}
                  <span className="text-muted-foreground">({oList.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Transfer rows with no partner. Often means a statement is missing on the other
                  side — or the row was mis-typed and should be reclassified.
                </p>
              </div>
              {orphansOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {orphansOpen && (
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {oList.map((o) => (
                  <OrphanRow key={o.id} orphan={o} onEdit={onEditOrphan} />
                ))}
              </div>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
