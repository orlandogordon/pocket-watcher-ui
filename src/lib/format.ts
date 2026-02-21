const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatCurrency(val: string | number): string {
  return currencyFormatter.format(parseFloat(String(val)));
}
