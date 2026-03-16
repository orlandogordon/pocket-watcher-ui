import { useState, useCallback } from 'react';
import { Check, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { formatCurrency } from '@/lib/format';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import type { CategoryResponse } from '@/types/categories';
import type { TagResponse } from '@/types/transactions';
import type { PreviewItem, DuplicateAction } from '@/types/uploads';

const DUPLICATE_TYPE_LABELS: Record<string, string> = {
  database: 'DB Match',
  within_statement: 'In Statement',
  both: 'DB + Statement',
};

export const TX_TYPES = [
  'PURCHASE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE',
  'CREDIT', 'INTEREST', 'DIVIDEND', 'BUY', 'SELL',
];

export const SECURITY_TYPES = ['STOCK', 'OPTION', 'ETF', 'MUTUAL_FUND', 'CRYPTO'];

export interface RowEdits {
  description: string;
  amount: string;
  transaction_type: string;
  transaction_date: string;
  merchant_name: string;
  category_uuid: string;
  subcategory_uuid: string;
  tag_uuids: string[];
  comments: string;
  // Investment-specific
  symbol: string;
  security_type: string;
  quantity: string;
  price_per_share: string;
  transaction_kind: 'regular' | 'investment';
}

interface PendingReviewTableProps {
  items: PreviewItem[];
  onReview: (tempId: string, action: DuplicateAction, edits?: RowEdits) => void;
  onBulkReview: (items: { temp_id: string; action: DuplicateAction }[]) => void;
  onEditSave: (tempId: string, edits: RowEdits) => void;
  isPending: boolean;
  pendingTempId: string | null;
}

export function isInvestmentItem(item: PreviewItem): boolean {
  if (item.transaction_kind === 'investment') return true;
  const pd = item.parsed_data as Record<string, unknown>;
  return pd.transaction_kind === 'investment' || (pd.total_amount != null && pd.amount == null);
}

export function useRowEdits(item: PreviewItem) {
  const edited = (item.edited_data ?? {}) as Record<string, unknown>;
  const pd = item.parsed_data as Record<string, string>;
  const isInvestment = isInvestmentItem(item);
  const txKind = isInvestment ? 'investment' as const : 'regular' as const;
  const [description, setDescription] = useState(String(edited.description ?? pd.description ?? ''));
  const [amount, setAmount] = useState(
    String(edited.amount ?? pd.amount ?? edited.total_amount ?? pd.total_amount ?? ''),
  );
  const [transactionType, setTransactionType] = useState(String(edited.transaction_type ?? pd.transaction_type ?? ''));
  const [transactionDate, setTransactionDate] = useState(String(edited.transaction_date ?? pd.transaction_date ?? ''));
  const [merchantName, setMerchantName] = useState(String(edited.merchant_name ?? pd.merchant_name ?? ''));
  const [categoryUuid, setCategoryUuid] = useState(String(edited.category_uuid ?? pd.category_uuid ?? ''));
  const [subcategoryUuid, setSubcategoryUuid] = useState(String(edited.subcategory_uuid ?? pd.subcategory_uuid ?? ''));
  const [tagUuids, setTagUuids] = useState<string[]>(
    Array.isArray(edited.tag_uuids) ? (edited.tag_uuids as string[]) : [],
  );
  const [comments, setComments] = useState(String(edited.comments ?? ''));
  const [symbol, setSymbol] = useState(String(edited.symbol ?? pd.symbol ?? ''));
  const [securityType, setSecurityType] = useState(String(edited.security_type ?? pd.security_type ?? ''));
  const [quantity, setQuantity] = useState(String(edited.quantity ?? pd.quantity ?? ''));
  const [pricePerShare, setPricePerShare] = useState(String(edited.price_per_share ?? pd.price_per_share ?? ''));

  function toggleTag(uuid: string) {
    setTagUuids((prev) =>
      prev.includes(uuid) ? prev.filter((t) => t !== uuid) : [...prev, uuid],
    );
  }

  return {
    edits: {
      description, amount, transaction_type: transactionType,
      transaction_date: transactionDate, merchant_name: merchantName,
      category_uuid: categoryUuid, subcategory_uuid: subcategoryUuid,
      tag_uuids: tagUuids, comments,
      symbol, security_type: securityType, quantity, price_per_share: pricePerShare,
      transaction_kind: txKind,
    } as RowEdits,
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
  };
}

export function TagsCell({
  tagUuids, allTags, onToggle, disabled,
}: {
  tagUuids: string[];
  allTags: TagResponse[];
  onToggle: (uuid: string) => void;
  disabled: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-full justify-start font-normal"
          disabled={disabled}
        >
          <Tag className="h-3 w-3 mr-1 shrink-0" />
          {tagUuids.length === 0
            ? 'No tags'
            : tagUuids.length === 1
              ? (allTags.find((t) => t.id === tagUuids[0])?.tag_name ?? '1 tag')
              : `${tagUuids.length} tags`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {allTags.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No tags available</p>
        ) : (
          <div className="space-y-1">
            {allTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer hover:bg-muted"
                onClick={() => onToggle(tag.id)}
              >
                <Checkbox
                  checked={tagUuids.includes(tag.id)}
                  onCheckedChange={() => onToggle(tag.id)}
                />
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs">{tag.tag_name}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PendingRow({
  item, onReview, onEditSave, isPending, pendingTempId, selected, onToggleSelect, categories, categoryMap, allTags, showInvestmentCols, showRegularCols,
}: {
  item: PreviewItem;
  onReview: (tempId: string, action: DuplicateAction, edits?: RowEdits) => void;
  onEditSave: (tempId: string, edits: RowEdits) => void;
  isPending: boolean;
  pendingTempId: string | null;
  selected: boolean;
  onToggleSelect: (tempId: string) => void;
  categories: CategoryResponse[];
  categoryMap: Map<string, CategoryResponse>;
  allTags: TagResponse[];
  showInvestmentCols: boolean;
  showRegularCols: boolean;
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
  } = useRowEdits(item);

  const isThisRowPending = pendingTempId === item.temp_id;
  const disabled = isPending || isThisRowPending;

  const subcategories = categories.filter((c) => c.parent_category_uuid === categoryUuid);

  function saveEdits(overrides?: Partial<RowEdits>) {
    onEditSave(item.temp_id, overrides ? { ...edits, ...overrides } : edits);
  }

  function handleCategoryChange(val: string) {
    setCategoryUuid(val);
    setSubcategoryUuid(''); // reset subcategory when category changes
  }

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(item.temp_id)} disabled={disabled} />
      </TableCell>
      {/* Date */}
      <TableCell>
        <Input
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          onBlur={saveEdits}
          className="h-7 text-xs w-28"
          disabled={disabled}
          placeholder="YYYY-MM-DD"
        />
      </TableCell>
      {/* Description + Merchant */}
      <TableCell>
        <div className="flex flex-col gap-1">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveEdits}
            className="h-7 text-xs"
            disabled={disabled}
            placeholder="Description"
          />
          <Input
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            onBlur={saveEdits}
            className="h-6 text-xs text-muted-foreground"
            disabled={disabled}
            placeholder="Merchant (optional)"
          />
        </div>
      </TableCell>
      {/* Amount */}
      <TableCell>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={saveEdits}
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
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
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
              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      {/* Category */}
      {showRegularCols && (
        <>
          <TableCell>
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
      {/* Tags */}
      <TableCell>
        <TagsCell tagUuids={tagUuids} allTags={allTags} onToggle={(uuid) => {
          const newTags = tagUuids.includes(uuid) ? tagUuids.filter((t) => t !== uuid) : [...tagUuids, uuid];
          toggleTag(uuid);
          saveEdits({ tag_uuids: newTags });
        }} disabled={disabled} />
      </TableCell>
      {/* Notes */}
      <TableCell>
        <Input
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          onBlur={saveEdits}
          className="h-7 text-xs w-32"
          disabled={disabled}
          placeholder="Notes"
        />
      </TableCell>
      {/* DB Match */}
      <TableCell>
        {item.duplicate_info?.existing_transaction ? (
          <div>
            <div className="text-xs font-medium truncate max-w-28">{item.duplicate_info.existing_transaction.description}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(item.duplicate_info.existing_transaction.total_amount ?? item.duplicate_info.existing_transaction.amount ?? '0'))}
              {' · '}{item.duplicate_info.existing_transaction.transaction_date}
            </div>
            {item.duplicate_type && (
              <Badge variant="secondary" className="text-xs mt-0.5">
                {DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? item.duplicate_type}
              </Badge>
            )}
          </div>
        ) : item.duplicate_type ? (
          <Badge variant="secondary" className="text-xs">
            {DUPLICATE_TYPE_LABELS[item.duplicate_type] ?? item.duplicate_type}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 hover:text-green-700"
            disabled={disabled}
            onClick={() => onReview(item.temp_id, 'approve', edits)}
          >
            <Check className="h-3 w-3 mr-1" />
            Ready
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 text-destructive hover:text-destructive hover:border-destructive"
            disabled={disabled}
            onClick={() => onReview(item.temp_id, 'reject', edits)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RejectedRow({
  item, onReview, isPending, pendingTempId, selected, onToggleSelect, showInvestmentCols,
}: {
  item: PreviewItem;
  onReview: (tempId: string, action: DuplicateAction) => void;
  isPending: boolean;
  pendingTempId: string | null;
  selected: boolean;
  onToggleSelect: (tempId: string) => void;
  showInvestmentCols: boolean;
  showRegularCols: boolean;
}) {
  const isThisRowPending = pendingTempId === item.temp_id;
  const disabled = isPending || isThisRowPending;
  const edited = (item.edited_data ?? {}) as Record<string, unknown>;
  const pd = item.parsed_data as Record<string, string>;
  const displayAmount = String(edited.amount ?? pd.amount ?? edited.total_amount ?? pd.total_amount ?? '0');

  return (
    <TableRow className="opacity-50">
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(item.temp_id)} disabled={disabled} />
      </TableCell>
      <TableCell className="text-xs">{String(edited.transaction_date ?? pd.transaction_date)}</TableCell>
      <TableCell className="text-xs">{String(edited.description ?? pd.description)}</TableCell>
      <TableCell className="text-xs text-right">
        {formatCurrency(parseFloat(displayAmount))}
      </TableCell>
      {showInvestmentCols && (
        <>
          <TableCell className="text-xs">{String(edited.symbol ?? pd.symbol ?? '')}</TableCell>
          <TableCell className="text-xs">{String(edited.security_type ?? pd.security_type ?? '')}</TableCell>
          <TableCell className="text-xs text-right">{String(edited.quantity ?? pd.quantity ?? '')}</TableCell>
          <TableCell className="text-xs text-right">{String(edited.price_per_share ?? pd.price_per_share ?? '')}</TableCell>
        </>
      )}
      <TableCell className="text-xs">{String(edited.transaction_type ?? pd.transaction_type)}</TableCell>
      {showRegularCols && <><TableCell /><TableCell /></>}
      <TableCell /><TableCell /><TableCell />
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => onReview(item.temp_id, 'undo_reject')}
        >
          Restore
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function PendingReviewTable({ items, onReview, onBulkReview, onEditSave, isPending, pendingTempId }: PendingReviewTableProps) {
  const { data: categoriesData = [] } = useCategories();
  const categoryMap = buildCategoryMap(categoriesData);
  const { data: allTags = [] } = useTags();

  const showInvestmentCols = items.some((i) => isInvestmentItem(i));
  const showRegularCols = items.some((i) => !isInvestmentItem(i));

  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [selectedRejected, setSelectedRejected] = useState<Set<string>>(new Set());

  const pendingItems = items.filter((i) => i.review_status !== 'rejected');
  const rejectedItems = items.filter((i) => i.review_status === 'rejected');

  const togglePending = useCallback((tempId: string) => {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const toggleRejected = useCallback((tempId: string) => {
    setSelectedRejected((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((i) => selectedPending.has(i.temp_id));
  const somePendingSelected = selectedPending.size > 0 && !allPendingSelected;
  const allRejectedSelected = rejectedItems.length > 0 && rejectedItems.every((i) => selectedRejected.has(i.temp_id));
  const someRejectedSelected = selectedRejected.size > 0 && !allRejectedSelected;

  function toggleAllPending() {
    setSelectedPending(allPendingSelected ? new Set() : new Set(pendingItems.map((i) => i.temp_id)));
  }
  function toggleAllRejected() {
    setSelectedRejected(allRejectedSelected ? new Set() : new Set(rejectedItems.map((i) => i.temp_id)));
  }
  function handleBulkApprove() {
    onBulkReview([...selectedPending].map((id) => ({ temp_id: id, action: 'approve' as const })));
    setSelectedPending(new Set());
  }
  function handleBulkReject() {
    onBulkReview([...selectedPending].map((id) => ({ temp_id: id, action: 'reject' as const })));
    setSelectedPending(new Set());
  }
  function handleBulkRestore() {
    onBulkReview([...selectedRejected].map((id) => ({ temp_id: id, action: 'undo_reject' as const })));
    setSelectedRejected(new Set());
  }

  const pendingHeader = (
    <TableRow>
      <TableHead className="w-10">
        <Checkbox
          checked={allPendingSelected ? true : somePendingSelected ? 'indeterminate' : false}
          onCheckedChange={toggleAllPending}
          disabled={isPending || pendingItems.length === 0}
        />
      </TableHead>
      <TableHead className="w-28">Date</TableHead>
      <TableHead>Description / Merchant</TableHead>
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
      <TableHead className="w-36">Tags</TableHead>
      <TableHead className="w-36">Notes</TableHead>
      <TableHead className="w-36">DB Match</TableHead>
      <TableHead className="w-36">Actions</TableHead>
    </TableRow>
  );

  const rejectedHeader = (
    <TableRow>
      <TableHead className="w-10">
        <Checkbox
          checked={allRejectedSelected ? true : someRejectedSelected ? 'indeterminate' : false}
          onCheckedChange={toggleAllRejected}
          disabled={isPending || rejectedItems.length === 0}
        />
      </TableHead>
      <TableHead className="w-28">Date</TableHead>
      <TableHead>Description</TableHead>
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
      {showRegularCols && <><TableHead /><TableHead /></>}
      <TableHead /><TableHead /><TableHead />
      <TableHead className="w-36">Actions</TableHead>
    </TableRow>
  );

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No items pending review.</p>;
  }

  return (
    <div className="space-y-4">
      {pendingItems.length > 0 && (
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-300px)] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>{pendingHeader}</TableHeader>
              <TableBody>
                {pendingItems.map((item) => (
                  <PendingRow
                    key={item.temp_id}
                    item={item}
                    onReview={onReview}
                    onEditSave={onEditSave}
                    isPending={isPending}
                    pendingTempId={pendingTempId}
                    selected={selectedPending.has(item.temp_id)}
                    onToggleSelect={togglePending}
                    categories={categoriesData}
                    categoryMap={categoryMap}
                    allTags={allTags}
                    showInvestmentCols={showInvestmentCols}
                    showRegularCols={showRegularCols}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {selectedPending.size > 0 && (
            <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
              <span className="text-xs text-muted-foreground mr-2">{selectedPending.size} selected</span>
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 hover:text-green-700" onClick={handleBulkApprove} disabled={isPending}>
                <Check className="h-3 w-3 mr-1" />Move to Ready
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={handleBulkReject} disabled={isPending}>
                <X className="h-3 w-3 mr-1" />Reject Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {rejectedItems.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Rejected ({rejectedItems.length})</p>
          <div className="rounded-md border">
            <div className="max-h-[300px] overflow-x-auto overflow-y-auto">
              <Table>
                <TableHeader>{rejectedHeader}</TableHeader>
                <TableBody>
                  {rejectedItems.map((item) => (
                    <RejectedRow
                      key={item.temp_id}
                      item={item}
                      onReview={onReview}
                      isPending={isPending}
                      pendingTempId={pendingTempId}
                      selected={selectedRejected.has(item.temp_id)}
                      onToggleSelect={toggleRejected}
                      showInvestmentCols={showInvestmentCols}
                      showRegularCols={showRegularCols}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            {selectedRejected.size > 0 && (
              <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
                <span className="text-xs text-muted-foreground mr-2">{selectedRejected.size} selected</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkRestore} disabled={isPending}>
                  Restore Selected
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
