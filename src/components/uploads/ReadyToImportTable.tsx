import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatTypeLabel } from '@/lib/format';
import { useCategories, buildCategoryMap } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import type { CategoryResponse } from '@/types/categories';
import type { TagResponse } from '@/types/transactions';
import type { MerchantSource, PreviewItem } from '@/types/uploads';
import { useRowEdits, isInvestmentItem, TX_TYPES, SECURITY_TYPES, type RowEdits } from './upload-utils';
import { TagsCell } from './TagsCell';

const DUPLICATE_TYPE_LABELS: Record<string, string> = {
  database: 'DB Match',
  within_statement: 'In Statement',
  both: 'DB + Statement',
};

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function MerchantSourceBadge({ source }: { source: Exclude<MerchantSource, null> }) {
  const isRegex = source === 'regex';
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] shrink-0 px-1 py-0',
        isRegex
          ? 'bg-sky-50 text-sky-700 border-sky-200'
          : 'bg-violet-50 text-violet-700 border-violet-200',
      )}
      title={isRegex ? 'Merchant extracted deterministically by regex' : 'Merchant suggested by LLM — review carefully'}
    >
      {isRegex ? 'Regex' : 'LLM'}
    </Badge>
  );
}

interface ReadyToImportTableProps {
  items: PreviewItem[];
  onReject: (tempId: string) => void;
  onBulkReject: (tempIds: string[]) => void;
  onEditSave: (tempId: string, edits: RowEdits) => void;
  isPending: boolean;
  pendingTempId: string | null;
}

function SuggestedPill() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] shrink-0 gap-0.5 px-1 py-0 border-violet-200 bg-violet-50 text-violet-700"
      title="Pre-filled from AI suggestion. Edit to override."
    >
      <Sparkles className="h-2.5 w-2.5" />
      Suggested
    </Badge>
  );
}

function DetailRow({
  item,
  colSpan,
  showInvestmentCols,
}: {
  item: PreviewItem;
  colSpan: number;
  showInvestmentCols: boolean;
}) {
  const pd = item.parsed_data;
  const rawAmount = pd.amount ?? pd.total_amount ?? '0';

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="py-2 px-4">
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-muted-foreground">Original description: </span>
            <span className="font-mono break-all">{pd.description || '—'}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5">
            <div className="truncate">
              <span className="text-muted-foreground">Parser merchant: </span>
              <span>{pd.merchant_name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Raw date: </span>
              <span>{pd.transaction_date}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Raw amount: </span>
              <span>{formatCurrency(parseFloat(String(rawAmount)))}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Raw type: </span>
              <span>{formatTypeLabel(pd.transaction_type)}</span>
            </div>
            {showInvestmentCols && (
              <>
                <div>
                  <span className="text-muted-foreground">Symbol: </span>
                  <span>{pd.symbol ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity: </span>
                  <span>{pd.quantity ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price/share: </span>
                  <span>{pd.price_per_share ?? '—'}</span>
                </div>
              </>
            )}
            {item.llm_model && (
              <div className="truncate">
                <span className="text-muted-foreground">Model: </span>
                <span className="font-mono">{item.llm_model}</span>
              </div>
            )}
            {item.llm_processed_at && (
              <div className="truncate">
                <span className="text-muted-foreground">Processed: </span>
                <span>{new Date(item.llm_processed_at).toLocaleString()}</span>
              </div>
            )}
            {item.llm_suggestion && (
              <div>
                <span className="text-muted-foreground">Confidence: </span>
                <span>{(item.llm_suggestion.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ReadyRow({
  item, onReject, onEditSave, isPending, pendingTempId, selected, onToggleSelect, expanded, onToggleExpanded, categories, categoryMap, allTags, showInvestmentCols, showRegularCols, totalCols,
}: {
  item: PreviewItem;
  onReject: (tempId: string) => void;
  onEditSave: (tempId: string, edits: RowEdits) => void;
  isPending: boolean;
  pendingTempId: string | null;
  selected: boolean;
  onToggleSelect: (tempId: string) => void;
  expanded: boolean;
  onToggleExpanded: (tempId: string) => void;
  categories: CategoryResponse[];
  categoryMap: Map<string, CategoryResponse>;
  allTags: TagResponse[];
  showInvestmentCols: boolean;
  showRegularCols: boolean;
  totalCols: number;
}) {
  const {
    edits,
    description, setDescription,
    amount, setAmount,
    transactionType, setTransactionType,
    transactionDate, setTransactionDate,
    merchantName, setMerchantName,
    categoryUuid, setCategoryUuid,
    subcategoryUuid, setSubcategoryUuid,
    tagUuids, toggleTag,
    comments, setComments,
    symbol, setSymbol,
    securityType, setSecurityType,
    quantity, setQuantity,
    pricePerShare, setPricePerShare,
    isInvestment,
    suggestedMerchant,
    suggestedCategory,
  } = useRowEdits(item, categoryMap);

  const isThisRowPending = pendingTempId === item.temp_id;
  const disabled = isPending || isThisRowPending;

  const subcategories = categories.filter((c) => c.parent_category_uuid === categoryUuid);

  // Mirror the backend's confirm-time auto-tag (uploads.py:962): rows with a
  // null/empty merchant or no category will pick up the "Needs Review" system
  // tag. Show a heads-up so the user isn't surprised post-import. Investment
  // rows are exempt (no category/merchant on that path).
  const willNeedReview =
    !isInvestment && (!categoryUuid || !merchantName.trim());

  // Belt-and-suspenders for the rare case where the backend left a
  // non-null suggestion through with low confidence (shouldn't happen
  // post-#34 since low-conf categories null out, but cheap insurance).
  const isLowConfidence =
    item.llm_suggestion != null && item.llm_suggestion.confidence < LOW_CONFIDENCE_THRESHOLD;

  function saveEdits(overrides?: Partial<RowEdits>) {
    onEditSave(item.temp_id, overrides ? { ...edits, ...overrides } : edits);
  }

  function handleCategoryChange(val: string) {
    setCategoryUuid(val);
    setSubcategoryUuid('');
  }

  return (
    <>
      <TableRow className={cn((willNeedReview || isLowConfidence) && 'border-l-4 border-l-amber-400')}>
        <TableCell>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleExpanded(item.temp_id)}
              className="text-muted-foreground hover:text-foreground"
              title={expanded ? 'Hide original' : 'View original'}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(item.temp_id)} disabled={disabled} />
          </div>
        </TableCell>
        {/* Date */}
        <TableCell>
          <Input
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            onBlur={() => saveEdits()}
            className="h-7 text-xs w-28"
            disabled={disabled}
            placeholder="YYYY-MM-DD"
          />
        </TableCell>
        {/* Description + Merchant + duplicate / suggested / source pills */}
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => saveEdits()}
                className="h-7 text-xs"
                disabled={disabled}
                placeholder="Description"
              />
              {item.duplicate_type && item.duplicate_type !== 'unmapped_type' && (
                <Badge
                  variant="secondary"
                  className="text-[10px] shrink-0 bg-amber-100 text-amber-700 border-amber-200"
                  title={
                    item.duplicate_info?.existing_transaction
                      ? `Duplicate: ${item.duplicate_info.existing_transaction.description} · ${formatCurrency(parseFloat(item.duplicate_info.existing_transaction.total_amount ?? item.duplicate_info.existing_transaction.amount ?? '0'))} · ${item.duplicate_info.existing_transaction.transaction_date}`
                      : `Duplicate (${DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? item.duplicate_type})`
                  }
                >
                  {DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? 'Dup'}
                </Badge>
              )}
            </div>
            {!isInvestment && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  onBlur={() => saveEdits()}
                  className="h-6 text-xs text-muted-foreground"
                  disabled={disabled}
                  placeholder="Merchant (none detected)"
                />
                {item.merchant_source && merchantName.trim() && (
                  <MerchantSourceBadge source={item.merchant_source} />
                )}
                {suggestedMerchant && <SuggestedPill />}
              </div>
            )}
            {willNeedReview && (
              <div
                className="text-[10px] text-amber-700"
                title="Backend will auto-apply the Needs Review system tag at confirm time when category or merchant is blank."
              >
                Will be tagged Needs Review on import
              </div>
            )}
          </div>
        </TableCell>
        {/* Amount */}
        <TableCell>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => saveEdits()}
            className="h-7 text-xs w-24 text-right"
            disabled={disabled}
          />
        </TableCell>
        {/* Investment columns */}
        {showInvestmentCols && (
          <>
            <TableCell>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onBlur={() => saveEdits()}
                className="h-7 text-xs w-20"
                disabled={disabled || !isInvestment}
                placeholder={isInvestment ? 'Symbol' : ''}
              />
            </TableCell>
            <TableCell>
              <Select value={securityType} onValueChange={(val) => { setSecurityType(val); saveEdits({ security_type: val }); }} disabled={disabled || !isInvestment}>
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue placeholder="Security" />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{formatTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={() => saveEdits()}
                className="h-7 text-xs w-16 text-right"
                disabled={disabled || !isInvestment}
                placeholder={isInvestment ? 'Qty' : ''}
              />
            </TableCell>
            <TableCell>
              <Input
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                onBlur={() => saveEdits()}
                className="h-7 text-xs w-20 text-right"
                disabled={disabled || !isInvestment}
                placeholder={isInvestment ? 'Price' : ''}
              />
            </TableCell>
          </>
        )}
        {/* Type */}
        <TableCell>
          <Select value={transactionType} onValueChange={(val) => { setTransactionType(val); saveEdits({ transaction_type: val }); }} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{formatTypeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        {/* Category */}
        {showRegularCols && (
          <>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Select value={categoryUuid} onValueChange={(val) => { handleCategoryChange(val); saveEdits({ category_uuid: val, subcategory_uuid: '' }); }} disabled={disabled}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => !c.parent_category_uuid).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isInvestment && suggestedCategory && <SuggestedPill />}
              </div>
            </TableCell>
            {/* Subcategory */}
            <TableCell>
              <Select
                value={subcategoryUuid}
                onValueChange={(val) => { setSubcategoryUuid(val); saveEdits({ subcategory_uuid: val }); }}
                disabled={disabled || subcategories.length === 0}
              >
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="No subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </>
        )}
        {/* Tags (not supported for investment transactions) */}
        {showRegularCols && (
          <TableCell>
            {!isInvestment && (
              <TagsCell tagUuids={tagUuids} allTags={allTags} onToggle={(uuid) => {
                const newTags = tagUuids.includes(uuid) ? tagUuids.filter((t) => t !== uuid) : [...tagUuids, uuid];
                toggleTag(uuid);
                saveEdits({ tag_uuids: newTags });
              }} disabled={disabled} />
            )}
          </TableCell>
        )}
        {/* Comments */}
        <TableCell>
          <Input
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            onBlur={() => saveEdits()}
            className="h-7 text-xs w-32"
            disabled={disabled}
            placeholder="Notes"
          />
        </TableCell>
        {/* Actions */}
        <TableCell>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            disabled={disabled}
            onClick={() => onReject(item.temp_id)}
            title="Reject this item"
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <DetailRow item={item} colSpan={totalCols} showInvestmentCols={showInvestmentCols} />
      )}
    </>
  );
}

export function ReadyToImportTable({ items, onReject, onBulkReject, onEditSave, isPending, pendingTempId }: ReadyToImportTableProps) {
  const { data: categoriesData = [] } = useCategories();
  const categoryMap = buildCategoryMap(categoriesData);
  const { data: allTags = [] } = useTags();

  const showInvestmentCols = items.some((i) => isInvestmentItem(i));
  const showRegularCols = items.some((i) => !isInvestmentItem(i));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((tempId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((tempId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.temp_id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.temp_id)));
  }

  function handleBulkReject() {
    onBulkReject([...selected]);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No items ready to import yet.
      </p>
    );
  }

  // Total column count for the detail-row colSpan.
  // Base: select(1) + Date + Description + Amount + Type + Notes + Actions = 7
  // + investment cols: 4 (Symbol, Security, Qty, Price)
  // + regular cols: 2 (Category, Subcategory) + 1 (Tags)
  const totalCols = 7 + (showInvestmentCols ? 4 : 0) + (showRegularCols ? 3 : 0);

  return (
    <div className="rounded-md border">
      <div className="max-h-[calc(100vh-300px)] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  disabled={isPending || items.length === 0}
                />
              </TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>{showRegularCols ? 'Description / Merchant' : 'Description'}</TableHead>
              <TableHead className="w-28">Amount</TableHead>
              {showInvestmentCols && (
                <>
                  <TableHead className="w-20">Symbol</TableHead>
                  <TableHead className="w-20">Security</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-20">Price</TableHead>
                </>
              )}
              <TableHead className="w-32">Type</TableHead>
              {showRegularCols && (
                <>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead className="w-40">Subcategory</TableHead>
                </>
              )}
              {showRegularCols && <TableHead className="w-36">Tags</TableHead>}
              <TableHead className="w-36">Notes</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ReadyRow
                key={item.temp_id}
                item={item}
                onReject={onReject}
                onEditSave={onEditSave}
                isPending={isPending}
                pendingTempId={pendingTempId}
                selected={selected.has(item.temp_id)}
                onToggleSelect={toggle}
                expanded={expanded.has(item.temp_id)}
                onToggleExpanded={toggleExpanded}
                categories={categoriesData}
                categoryMap={categoryMap}
                allTags={allTags}
                showInvestmentCols={showInvestmentCols}
                showRegularCols={showRegularCols}
                totalCols={totalCols}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
          <span className="text-xs text-muted-foreground mr-2">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleBulkReject}
            disabled={isPending}
          >
            <X className="h-3 w-3 mr-1" />
            Reject Selected
          </Button>
        </div>
      )}
    </div>
  );
}
