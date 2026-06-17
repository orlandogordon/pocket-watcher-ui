import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { formatTypeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BulkTransactionPatch } from '@/types/transactions';

const TRANSACTION_TYPES = [
  'PURCHASE',
  'WITHDRAWAL',
  'FEE',
  'DEPOSIT',
  'CREDIT',
  'INTEREST',
  'TRANSFER_IN',
  'TRANSFER_OUT',
] as const;

export interface BulkApplyPayload {
  patch: BulkTransactionPatch;
  addTagUuids: string[];
  removeTagUuids: string[];
  clearReview: boolean;
}

interface BulkEditPanelProps {
  selectedCount: number;
  pending: boolean;
  error: string | null;
  onApply: (payload: BulkApplyPayload) => void;
  onMarkReviewed: () => void;
}

/** A field row gated by an opt-in checkbox; children render disabled when off. */
function FieldToggle({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={enabled} onCheckedChange={(v) => onToggle(v === true)} />
        {label}
      </label>
      <div className={cn(!enabled && 'pointer-events-none opacity-40')}>{children}</div>
    </div>
  );
}

export function BulkEditPanel({
  selectedCount,
  pending,
  error,
  onApply,
  onMarkReviewed,
}: BulkEditPanelProps) {
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const allCategories = categories ?? [];
  const parentCategories = allCategories.filter((c) => !c.parent_category_uuid);

  const tagOptions = useMemo(
    () =>
      (tags ?? [])
        .filter((t) => !t.is_system)
        .map((t) => ({ value: t.id, label: t.tag_name, color: t.color })),
    [tags],
  );

  const [enableCategory, setEnableCategory] = useState(false);
  const [categoryUuid, setCategoryUuid] = useState('');
  const [subcategoryUuid, setSubcategoryUuid] = useState('');

  const [enableType, setEnableType] = useState(false);
  const [transactionType, setTransactionType] = useState('');

  const [enableMerchant, setEnableMerchant] = useState(false);
  const [merchantName, setMerchantName] = useState('');

  const [enableComments, setEnableComments] = useState(false);
  const [comments, setComments] = useState('');

  const [enableTags, setEnableTags] = useState(false);
  const [addTagUuids, setAddTagUuids] = useState<string[]>([]);
  const [removeTagUuids, setRemoveTagUuids] = useState<string[]>([]);

  const [clearReview, setClearReview] = useState(true);

  const subcategories = allCategories.filter(
    (c) => c.parent_category_uuid === categoryUuid,
  );

  const hasFieldEdit =
    enableCategory ||
    enableType ||
    enableMerchant ||
    enableComments ||
    (enableTags && (addTagUuids.length > 0 || removeTagUuids.length > 0));

  // A type edit must pick a real value (no "clear" for an enum column).
  const typeIncomplete = enableType && !transactionType;
  const canApply =
    selectedCount > 0 &&
    !typeIncomplete &&
    (hasFieldEdit || clearReview);

  function buildPayload(): BulkApplyPayload {
    const patch: BulkTransactionPatch = {};
    if (enableCategory) {
      // "None" clears the column (explicit null); subcategory follows.
      patch.category_uuid = categoryUuid || null;
      patch.subcategory_uuid = categoryUuid ? subcategoryUuid || null : null;
    }
    if (enableType && transactionType) patch.transaction_type = transactionType;
    if (enableMerchant) patch.merchant_name = merchantName.trim() || null;
    if (enableComments) patch.comments = comments.trim() || null;
    return {
      patch,
      addTagUuids: enableTags ? addTagUuids : [],
      removeTagUuids: enableTags ? removeTagUuids : [],
      clearReview,
    };
  }

  return (
    <div className="flex flex-col gap-4 border-t bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bulk edit</h3>
        <span className="text-xs text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <FieldToggle label="Category" enabled={enableCategory} onToggle={setEnableCategory}>
          <div className="space-y-2">
            <Select
              value={categoryUuid || '_none_'}
              onValueChange={(v) => {
                setCategoryUuid(v === '_none_' ? '' : v);
                setSubcategoryUuid('');
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None (clear)</SelectItem>
                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={subcategoryUuid || '_none_'}
              onValueChange={(v) => setSubcategoryUuid(v === '_none_' ? '' : v)}
              disabled={!categoryUuid || subcategories.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None</SelectItem>
                {subcategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FieldToggle>

        <FieldToggle label="Type" enabled={enableType} onToggle={setEnableType}>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {formatTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldToggle>

        <FieldToggle label="Merchant" enabled={enableMerchant} onToggle={setEnableMerchant}>
          <Input
            className="h-9"
            placeholder="Merchant name (blank clears)"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
        </FieldToggle>

        <FieldToggle label="Tags" enabled={enableTags} onToggle={setEnableTags}>
          <div className="space-y-2">
            <MultiSelect
              options={tagOptions}
              value={addTagUuids}
              onChange={setAddTagUuids}
              placeholder="Add tags…"
              className="w-full"
            />
            <MultiSelect
              options={tagOptions}
              value={removeTagUuids}
              onChange={setRemoveTagUuids}
              placeholder="Remove tags…"
              className="w-full"
            />
          </div>
        </FieldToggle>
      </div>

      <FieldToggle label="Comments" enabled={enableComments} onToggle={setEnableComments}>
        <Textarea
          className="min-h-[60px]"
          placeholder="Comments (blank clears)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </FieldToggle>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={clearReview}
          onCheckedChange={(v) => setClearReview(v === true)}
        />
        <span>
          Mark reviewed
          <span className="ml-1 text-xs text-muted-foreground">
            (remove from queue)
          </span>
        </span>
      </label>

      {typeIncomplete && (
        <p className="text-xs text-amber-600">Pick a type or turn the toggle off.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || selectedCount === 0}
          onClick={onMarkReviewed}
        >
          Mark {selectedCount} reviewed
        </Button>
        <Button size="sm" disabled={pending || !canApply} onClick={() => onApply(buildPayload())}>
          {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Apply to {selectedCount}
        </Button>
      </div>
    </div>
  );
}
