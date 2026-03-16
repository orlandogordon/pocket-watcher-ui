import { useState, useCallback } from 'react';
import { Undo2 } from 'lucide-react';
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
import { useCategories, buildCategoryMap } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import type { CategoryResponse } from '@/types/categories';
import type { TagResponse } from '@/types/transactions';
import type { PreviewItem } from '@/types/uploads';
import { useRowEdits, isInvestmentItem, TagsCell, TX_TYPES, SECURITY_TYPES, type RowEdits } from './PendingReviewTable';

interface ReadyToImportTableProps {
  items: PreviewItem[];
  onMoveToReview: (tempId: string) => void;
  onBulkMoveToReview: (tempIds: string[]) => void;
  onEditSave: (tempId: string, edits: RowEdits) => void;
  isPending: boolean;
  pendingTempId: string | null;
}

function ReadyRow({
  item, onMoveToReview, onEditSave, isPending, pendingTempId, selected, onToggleSelect, categories, categoryMap, allTags, showInvestmentCols, showRegularCols,
}: {
  item: PreviewItem;
  onMoveToReview: (tempId: string) => void;
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
    setSubcategoryUuid('');
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
          onBlur={() => saveEdits()}
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
            onBlur={() => saveEdits()}
            className="h-7 text-xs"
            disabled={disabled}
            placeholder="Description"
          />
          <Input
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            onBlur={() => saveEdits()}
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
      {/* Source */}
      <TableCell>
        {item.source === 'approved_duplicate' ? (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            Approved
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            New
          </Badge>
        )}
      </TableCell>
      {/* Actions */}
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => onMoveToReview(item.temp_id)}
          title="Move back to Needs Review"
        >
          <Undo2 className="h-3 w-3 mr-1" />
          Review
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ReadyToImportTable({ items, onMoveToReview, onBulkMoveToReview, onEditSave, isPending, pendingTempId }: ReadyToImportTableProps) {
  const { data: categoriesData = [] } = useCategories();
  const categoryMap = buildCategoryMap(categoriesData);
  const { data: allTags = [] } = useTags();

  const showInvestmentCols = items.some((i) => isInvestmentItem(i));
  const showRegularCols = items.some((i) => !isInvestmentItem(i));

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((tempId: string) => {
    setSelected((prev) => {
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

  function handleBulkMoveToReview() {
    onBulkMoveToReview([...selected]);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No items ready to import yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="max-h-[calc(100vh-300px)] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  disabled={isPending || items.length === 0}
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
              <TableHead className="w-28">Source</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ReadyRow
                key={item.temp_id}
                item={item}
                onMoveToReview={onMoveToReview}
                onEditSave={onEditSave}
                isPending={isPending}
                pendingTempId={pendingTempId}
                selected={selected.has(item.temp_id)}
                onToggleSelect={toggle}
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
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
          <span className="text-xs text-muted-foreground mr-2">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleBulkMoveToReview}
            disabled={isPending}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Move to Review
          </Button>
        </div>
      )}
    </div>
  );
}
