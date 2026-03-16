import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useInvestmentHoldings,
  useInvestmentTransactions,
} from '@/hooks/useInvestments';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvestmentTransactionFormDialog } from '@/components/investments/InvestmentTransactionFormDialog';
import { DeleteInvestmentTransactionDialog } from '@/components/investments/DeleteInvestmentTransactionDialog';
import type { InvestmentTransactionResponse, InvestmentTransactionType } from '@/types/investments';

const TX_TYPE_COLORS: Record<InvestmentTransactionType, string> = {
  BUY: 'bg-blue-100 text-blue-800',
  SELL: 'bg-green-100 text-green-800',
  DIVIDEND: 'bg-purple-100 text-purple-800',
  INTEREST: 'bg-indigo-100 text-indigo-800',
  FEE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-yellow-100 text-yellow-800',
  SPLIT: 'bg-amber-100 text-amber-800',
  MERGER: 'bg-teal-100 text-teal-800',
  SPINOFF: 'bg-pink-100 text-pink-800',
  REINVESTMENT: 'bg-cyan-100 text-cyan-800',
  OTHER: 'bg-gray-100 text-gray-800',
};


/** Parse an OCC option symbol into a human-readable label.
 *  Format: SYMBOL + YYMMDD + C/P + 00000000 (strike * 1000)
 *  e.g. "JPM240816C00200000" → "$200 Call 08/16/24"
 *  Returns null if the symbol doesn't match the OCC pattern. */
function formatOptionSymbol(apiSymbol: string): string | null {
  const match = apiSymbol.match(/^(.+?)(\d{6})([CP])(\d{8})$/);
  if (!match) return null;
  const [, , dateStr, callPut, strikeStr] = match;
  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);
  const strike = parseInt(strikeStr, 10) / 1000;
  const strikeLabel = strike % 1 === 0 ? `$${strike}` : `$${strike.toFixed(2)}`;
  const typeLabel = callPut === 'C' ? 'Call' : 'Put';
  return `${strikeLabel} ${typeLabel} ${mm}/${dd}/${yy}`;
}

function getSalePL(tx: InvestmentTransactionResponse): number {
  if (tx.transaction_type !== 'SELL' || !tx.cost_basis_at_sale || !tx.price_per_share || !tx.quantity) return 0;
  return (parseFloat(tx.price_per_share) - parseFloat(tx.cost_basis_at_sale)) * parseFloat(tx.quantity);
}

export function InvestmentDetailPage() {
  const { accountUuid } = useParams<{ accountUuid: string }>();
  const { data: accounts } = useAccounts();
  const account = accounts?.find((a) => a.uuid === accountUuid);
  const { data: holdings, isLoading: holdingsLoading } = useInvestmentHoldings(accountUuid ?? '');
  const { data: transactions, isLoading: txLoading } = useInvestmentTransactions(accountUuid ?? '');

  // Transaction dialogs
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<InvestmentTransactionResponse | undefined>();
  const [deleteTx, setDeleteTx] = useState<InvestmentTransactionResponse | null>(null);

  // Transaction filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [txPage, setTxPage] = useState(0);
  const [txPageSize, setTxPageSize] = useState(25);

  // Sort state
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortDesc, setSortDesc] = useState(true);

  function toggleSort(column: string) {
    if (sortBy === column) {
      setSortDesc((d) => !d);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
    setTxPage(0);
  }

  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return null;
    return sortDesc ? (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
    );
  }

  const txSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions ?? []) {
      if (tx.symbol) set.add(tx.symbol);
    }
    return [...set].sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const filtered = transactions.filter((tx) => {
      if (filterType !== 'all' && tx.transaction_type !== filterType) return false;
      if (filterSymbol !== 'all' && tx.symbol !== filterSymbol) return false;
      const txDate = tx.transaction_date.slice(0, 10);
      if (filterDateFrom && txDate < filterDateFrom) return false;
      if (filterDateTo && txDate > filterDateTo) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'transaction_date':
          cmp = a.transaction_date.localeCompare(b.transaction_date);
          break;
        case 'transaction_type':
          cmp = a.transaction_type.localeCompare(b.transaction_type);
          break;
        case 'symbol':
          cmp = (a.symbol ?? '').localeCompare(b.symbol ?? '');
          break;
        case 'security_type':
          cmp = (a.security_type ?? '').localeCompare(b.security_type ?? '');
          break;
        case 'price_per_share':
          cmp = parseFloat(a.price_per_share ?? '0') - parseFloat(b.price_per_share ?? '0');
          break;
        case 'total_amount':
          cmp = parseFloat(a.total_amount) - parseFloat(b.total_amount);
          break;
        case 'sale_pl': {
          const plA = getSalePL(a);
          const plB = getSalePL(b);
          cmp = plA - plB;
          break;
        }
        default:
          cmp = 0;
      }
      return sortDesc ? -cmp : cmp;
    });

    return filtered;
  }, [transactions, filterType, filterSymbol, filterDateFrom, filterDateTo, sortBy, sortDesc]);

  // Reset to first page when filters change
  const filterKey = `${filterType}|${filterSymbol}|${filterDateFrom}|${filterDateTo}`;
  useMemo(() => setTxPage(0), [filterKey]);

  const showAll = txPageSize === 0;
  const totalTxPages = showAll ? 1 : Math.max(1, Math.ceil(filteredTransactions.length / txPageSize));
  const paginatedTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(txPage * txPageSize, (txPage + 1) * txPageSize);

  const hasActiveFilters =
    filterType !== 'all' || filterSymbol !== 'all' || filterDateFrom !== '' || filterDateTo !== '';

  function clearFilters() {
    setFilterType('all');
    setFilterSymbol('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setTxPage(0);
  }

  if (!accountUuid) return null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/investments"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Investments
        </Link>
        {account ? (
          <>
            <h1 className="text-xl font-semibold">{account.account_name}</h1>
            <p className="text-sm text-muted-foreground">
              {account.institution_name} &middot; Balance: {formatCurrency(account.balance)}
            </p>
          </>
        ) : (
          <h1 className="text-xl font-semibold">Investment Account</h1>
        )}
      </div>

      {/* Holdings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Holdings</h2>
        </div>

        {holdingsLoading ? (
          <p className="text-sm text-muted-foreground">Loading holdings...</p>
        ) : !holdings?.length ? (
          <p className="text-sm text-muted-foreground">No holdings yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">% Gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => {
                  const qty = parseFloat(h.quantity);
                  const cost = parseFloat(h.average_cost_basis);
                  const price = h.current_price != null ? parseFloat(h.current_price) : NaN;
                  const hasPrice = !isNaN(price);
                  const marketValue = hasPrice ? qty * price : NaN;
                  const costBasis = qty * cost;
                  const pl = hasPrice ? marketValue - costBasis : NaN;
                  const pctGain = hasPrice && costBasis !== 0 ? (pl / costBasis) * 100 : NaN;

                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          {h.symbol}
                          {h.api_symbol && h.api_symbol !== h.symbol && (
                            <span className="text-xs text-muted-foreground" title={h.api_symbol}>{formatOptionSymbol(h.api_symbol) ?? h.api_symbol}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.security_type ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{qty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(cost.toString())}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {hasPrice ? formatCurrency(price.toString()) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {hasPrice ? formatCurrency(marketValue.toString()) : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          hasPrice
                            ? pl >= 0 ? 'text-green-600' : 'text-destructive'
                            : undefined,
                        )}
                      >
                        {hasPrice
                          ? `${pl >= 0 ? '+' : ''}${formatCurrency(pl.toString())}`
                          : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          hasPrice
                            ? pctGain >= 0 ? 'text-green-600' : 'text-destructive'
                            : undefined,
                        )}
                      >
                        {hasPrice && !isNaN(pctGain)
                          ? `${pctGain >= 0 ? '+' : ''}${pctGain.toFixed(2)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {(() => {
                const totalMV = holdings.reduce((sum, h) => {
                  const p = h.current_price != null ? parseFloat(h.current_price) : NaN;
                  return isNaN(p) ? sum : sum + parseFloat(h.quantity) * p;
                }, 0);
                const totalCB = holdings.reduce((sum, h) => {
                  const p = h.current_price != null ? parseFloat(h.current_price) : NaN;
                  return isNaN(p) ? sum : sum + parseFloat(h.quantity) * parseFloat(h.average_cost_basis);
                }, 0);
                const totalPL = totalMV - totalCB;
                const totalPct = totalCB !== 0 ? (totalPL / totalCB) * 100 : 0;

                return (
                  <TableFooter>
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(totalMV.toString())}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          totalPL >= 0 ? 'text-green-600' : 'text-destructive',
                        )}
                      >
                        {totalPL >= 0 ? '+' : ''}
                        {formatCurrency(totalPL.toString())}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          totalPct >= 0 ? 'text-green-600' : 'text-destructive',
                        )}
                      >
                        {totalPct >= 0 ? '+' : ''}
                        {totalPct.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                );
              })()}
            </Table>
          </div>
        )}
      </div>

      {/* Investment Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Investment Transactions</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditTx(undefined);
              setTxFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        {transactions && transactions.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TRANSFER', 'SPLIT', 'MERGER', 'SPINOFF', 'REINVESTMENT', 'OTHER'] as const).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Symbol</label>
              <Select value={filterSymbol} onValueChange={setFilterSymbol}>
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {txSymbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-[140px] h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-[140px] h-8 text-sm"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        )}

        {txLoading ? (
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        ) : !transactions?.length ? (
          <p className="text-sm text-muted-foreground">No investment transactions yet.</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions match the current filters.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('transaction_date')}>
                    Date<SortIcon column="transaction_date" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('transaction_type')}>
                    Type<SortIcon column="transaction_type" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('symbol')}>
                    Symbol<SortIcon column="symbol" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('security_type')}>
                    Security<SortIcon column="security_type" />
                  </TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('price_per_share')}>
                    Price/Share<SortIcon column="price_per_share" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('total_amount')}>
                    Total<SortIcon column="total_amount" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('sale_pl')}>
                    Sale P&L<SortIcon column="sale_pl" />
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="tabular-nums text-sm">
                      {format(parseISO(tx.transaction_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', TX_TYPE_COLORS[tx.transaction_type])}
                      >
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium" title={tx.api_symbol && tx.api_symbol !== tx.symbol ? `${tx.symbol} (${tx.api_symbol})` : tx.symbol ?? undefined}>
                      <div className="flex flex-col">
                        {tx.symbol ?? '—'}
                        {tx.api_symbol && tx.api_symbol !== tx.symbol && (
                          <span className="text-xs text-muted-foreground" title={tx.api_symbol}>{formatOptionSymbol(tx.api_symbol) ?? tx.api_symbol}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" title={tx.security_type ?? undefined}>
                      {tx.security_type ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx.quantity ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums" title={tx.price_per_share ?? undefined}>
                      {tx.price_per_share
                        ? formatCurrency(tx.price_per_share)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium" title={tx.total_amount}>
                      {formatCurrency(tx.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {(() => {
                        const pl = getSalePL(tx);
                        if (tx.transaction_type !== 'SELL' || !tx.cost_basis_at_sale || !tx.price_per_share || !tx.quantity) return '—';
                        const cost = parseFloat(tx.cost_basis_at_sale);
                        const pct = cost !== 0 ? ((parseFloat(tx.price_per_share) - cost) / cost) * 100 : 0;
                        return (
                          <span className={pl > 0 ? 'text-green-600' : pl < 0 ? 'text-red-500' : ''}>
                            {pl >= 0 ? '+' : ''}{formatCurrency(pl.toString())}
                            {' '}
                            <span className="text-xs">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={tx.description ?? undefined}>
                      {tx.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditTx(tx);
                            setTxFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTx(tx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(txPageSize)}
                onValueChange={(v) => {
                  setTxPageSize(Number(v));
                  setTxPage(0);
                }}
              >
                <SelectTrigger className="w-[72px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="0">All</SelectItem>
                </SelectContent>
              </Select>
              <span>
                {showAll
                  ? `${filteredTransactions.length} total`
                  : `${txPage * txPageSize + 1}–${Math.min((txPage + 1) * txPageSize, filteredTransactions.length)} of ${filteredTransactions.length}`}
              </span>
            </div>
            {!showAll && filteredTransactions.length > txPageSize && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPage === 0}
                  onClick={() => setTxPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPage >= totalTxPages - 1}
                  onClick={() => setTxPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <InvestmentTransactionFormDialog
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        accountUuid={accountUuid}
        transaction={editTx}
      />
      <DeleteInvestmentTransactionDialog
        open={!!deleteTx}
        onOpenChange={(open) => { if (!open) setDeleteTx(null); }}
        transaction={deleteTx}
      />
    </div>
  );
}
