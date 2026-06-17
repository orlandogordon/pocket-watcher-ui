import type { AttentionItem } from '@/types/data-health';
import {
  getAccountName,
  getAmount,
  getCategory,
  getDate,
  getDescription,
  getMerchant,
  getTypeLabel,
} from './inboxItem';

export type GroupMode = 'merchant' | 'description' | 'amount';

export interface ReviewGroup {
  key: string;
  label: string;
  items: AttentionItem[];
  count: number;
  total: number; // summed absolute amount
  minDate: string | null;
  maxDate: string | null;
  accounts: Set<string>;
  distinctTypes: Set<string>;
  hasCategoryConflict: boolean;
}

const PROCESSOR_PREFIXES = [
  /^SQ\s*\*\s*/, // Square
  /^TST\s*\*\s*/, // Toast
  /^PP\s*\*\s*/, // PayPal
  /^PAYPAL\s*\*\s*/,
  /^SP\s*\*\s*/, // Shopify / Stripe storefronts
  /^GOOGLE\s*\*\s*/,
  /^AMZN MKTP/, // collapse to AMAZON below
  /^AMZN\s*\*\s*/,
  /^AMAZON\.COM/,
];

/**
 * Aggressively normalize a merchant/description string for *grouping only* —
 * this never rewrites the stored value. Collapses store numbers, trailing
 * digit/date runs, and known payment-processor prefixes so the same merchant
 * on different dates/locations lands in one bucket.
 */
export function normalizeMerchant(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.toUpperCase().trim();

  // Strip known processor prefixes (Square/Toast/PayPal/etc.).
  for (const re of PROCESSOR_PREFIXES) {
    if (re.test(s)) {
      s = s.replace(re, '');
      break;
    }
  }
  // Amazon marketplace variants all collapse to AMAZON.
  if (/^AMZN MKTP|^AMAZON\.COM|^AMZN/.test(raw.toUpperCase().trim())) {
    return 'AMAZON';
  }

  s = s
    // store-number patterns: "#1234", "STORE 1234", "STR# 12"
    .replace(/\b(STORE|STR)\s*#?\s*\d+\b/g, '')
    .replace(/#\s*\d+/g, '')
    // date tokens like 01/02 or 01-02-24
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, '')
    // long trailing digit runs (transaction/terminal ids)
    .replace(/\s+\d{3,}\s*$/g, '')
    // trailing state/zip noise: "  CA 94016"
    .replace(/\s+[A-Z]{2}\s+\d{4,5}\s*$/g, '')
    // collapse leftover punctuation + whitespace
    .replace(/[*#]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return s;
}

function bumpDateRange(
  cur: { min: string | null; max: string | null },
  date: string | null,
): void {
  if (!date) return;
  if (cur.min === null || date < cur.min) cur.min = date;
  if (cur.max === null || date > cur.max) cur.max = date;
}

/**
 * Bucket needs_review items by the chosen mode. Returns groups sorted by count
 * descending (biggest backlog first) so the user clears the most repetitive
 * work earliest.
 */
export function groupNeedsReview(
  items: AttentionItem[],
  mode: GroupMode,
): ReviewGroup[] {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      items: AttentionItem[];
      dateRange: { min: string | null; max: string | null };
      accounts: Set<string>;
      types: Set<string>;
      categories: Set<string>;
      total: number;
    }
  >();

  for (const item of items) {
    let key: string;
    let label: string;

    if (mode === 'amount') {
      const raw = getAmount(item);
      const n = raw !== null ? Math.abs(parseFloat(raw)) : NaN;
      key = Number.isNaN(n) ? 'unknown' : n.toFixed(2);
      label = Number.isNaN(n) ? 'Unknown amount' : `$${n.toFixed(2)}`;
    } else if (mode === 'description') {
      const norm = normalizeMerchant(getDescription(item));
      key = norm || 'unknown';
      label = norm || '(no description)';
    } else {
      // merchant: fall back to description when merchant is absent.
      const norm = normalizeMerchant(getMerchant(item) ?? getDescription(item));
      key = norm || 'unknown';
      label = norm || '(no merchant)';
    }

    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        label,
        items: [],
        dateRange: { min: null, max: null },
        accounts: new Set(),
        types: new Set(),
        categories: new Set(),
        total: 0,
      };
      buckets.set(key, b);
    }
    b.items.push(item);
    bumpDateRange(b.dateRange, getDate(item));
    const acct = getAccountName(item);
    if (acct) b.accounts.add(acct);
    const type = getTypeLabel(item);
    if (type) b.types.add(type);
    b.categories.add(getCategory(item) ?? '—');
    const amt = getAmount(item);
    if (amt) b.total += Math.abs(parseFloat(amt));
  }

  return Array.from(buckets.values())
    .map((b) => ({
      key: b.key,
      label: b.label,
      items: b.items,
      count: b.items.length,
      total: b.total,
      minDate: b.dateRange.min,
      maxDate: b.dateRange.max,
      accounts: b.accounts,
      distinctTypes: b.types,
      hasCategoryConflict: b.categories.size > 1,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
