import { format, parseISO } from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatCurrency(val: string | number): string {
  return currencyFormatter.format(parseFloat(String(val)));
}

export function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format an API datetime string (ISO-8601 UTC, `Z`-suffixed) as the user's
 * local date + time. The backend always emits UTC, so `new Date()` parses the
 * instant correctly and date-fns renders it in the local zone.
 *
 * Use this for *timestamp* fields (created_at, completed_at, llm_processed_at,
 * etc.). For bare calendar dates (`YYYY-MM-DD`) use {@link formatDate} instead,
 * which must NOT be shifted across time zones.
 */
export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy, h:mm a');
}

/**
 * Format a bare calendar date (`YYYY-MM-DD`, no time/zone) for display.
 * Parsed with date-fns `parseISO`, which treats a date-only string as local
 * midnight, so the calendar day is preserved (no timezone shift).
 *
 * Use this for *date* fields (transaction_date, value_date, payment_date,
 * snapshot dates). For instant timestamps use {@link formatDateTime}.
 */
export function formatDate(date: string, dateFormat = 'MMM d, yyyy'): string {
  return format(parseISO(date), dateFormat);
}
