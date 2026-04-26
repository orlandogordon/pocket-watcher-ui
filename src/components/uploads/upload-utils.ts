import { useState } from 'react';
import type { PreviewItem } from '@/types/uploads';
import type { CategoryResponse } from '@/types/categories';

export const TX_TYPES = [
  'PURCHASE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE',
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
  const pd = item.parsed_data;
  return pd.transaction_kind === 'investment' || (pd.total_amount != null && pd.amount == null);
}

export function useRowEdits(item: PreviewItem, categoryMap?: Map<string, CategoryResponse>) {
  const edited = (item.edited_data ?? {}) as Record<string, unknown>;
  const pd = item.parsed_data;
  const isInvestment = isInvestmentItem(item);
  const txKind = isInvestment ? 'investment' as const : 'regular' as const;
  const suggestion = item.llm_suggestion;

  // Description: edited > cleaned > raw parser
  const [description, setDescription] = useState(
    String(edited.description ?? item.cleaned_description ?? pd.description ?? ''),
  );
  const [amount, setAmount] = useState(
    String(edited.amount ?? pd.amount ?? edited.total_amount ?? pd.total_amount ?? ''),
  );
  const [transactionType, setTransactionType] = useState(String(edited.transaction_type ?? pd.transaction_type ?? ''));
  const [transactionDate, setTransactionDate] = useState(String(edited.transaction_date ?? pd.transaction_date ?? ''));

  // Merchant: edited > suggestion > parser
  const [merchantName, setMerchantNameState] = useState(
    String(edited.merchant_name ?? suggestion?.merchant_name ?? pd.merchant_name ?? ''),
  );
  const [merchantTouched, setMerchantTouched] = useState(edited.merchant_name !== undefined);
  function setMerchantName(val: string) {
    setMerchantNameState(val);
    setMerchantTouched(true);
  }

  // Category: edited > suggestion. Parent resolved from subcategory via categoryMap when only sub is known.
  function resolveParentFromSub(subUuid: string): string {
    if (!subUuid || !categoryMap) return '';
    const sub = categoryMap.get(subUuid);
    return sub?.parent_category_uuid ?? '';
  }
  const seedSubUuid = String(edited.subcategory_uuid ?? suggestion?.subcategory_uuid ?? '');
  const seedCatUuid = edited.category_uuid != null
    ? String(edited.category_uuid)
    : (suggestion?.category_uuid ?? resolveParentFromSub(seedSubUuid));

  const [categoryUuid, setCategoryUuidState] = useState(seedCatUuid);
  const [subcategoryUuid, setSubcategoryUuidState] = useState(seedSubUuid);
  const [categoryTouched, setCategoryTouched] = useState(
    edited.category_uuid !== undefined || edited.subcategory_uuid !== undefined,
  );
  function setCategoryUuid(val: string) {
    setCategoryUuidState(val);
    setCategoryTouched(true);
  }
  function setSubcategoryUuid(val: string) {
    setSubcategoryUuidState(val);
    setCategoryTouched(true);
  }

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

  // Pill visibility: suggestion exists for this field AND user has not touched it.
  const suggestedMerchant = !merchantTouched && !!suggestion?.merchant_name;
  const suggestedCategory = !categoryTouched && !!suggestion?.subcategory_uuid;

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
    suggestedMerchant,
    suggestedCategory,
  };
}
