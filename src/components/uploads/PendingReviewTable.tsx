import { useState } from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TagResponse } from '@/types/transactions';
import type { PreviewItem } from '@/types/uploads';

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
