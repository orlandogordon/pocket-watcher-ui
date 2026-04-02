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
