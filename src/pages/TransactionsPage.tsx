import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useTransactions, useTransactionStats } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/format';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { TransactionFilters, TransactionResponse } from '@/types/transactions';

const TRANSACTION_TYPES = [
  'PURCHASE',
  'WITHDRAWAL',
  'FEE',
  'DEPOSIT',
  'CREDIT',
  'INTEREST',
  'TRANSFER',
] as const;

const LIMIT = 50;

const EMPTY_FILTERS: TransactionFilters = {
  account_uuid: undefined,
  category_uuid: undefined,
  subcategory_uuid: undefined,
  transaction_type: undefined,
  date_from: undefined,
  date_to: undefined,
  description_search: undefined,
};

export function TransactionsPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [pendingSearch, setPendingSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransactionResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(null);

  const activeFilters: TransactionFilters = {
    ...filters,
    skip: page * LIMIT,
    limit: LIMIT,
    order_by: 'transaction_date',
    order_desc: true,
  };

  const { data: transactions, isLoading, isError } = useTransactions(activeFilters);
  const { data: stats } = useTransactionStats(filters);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const accountMap = new Map((accounts ?? []).map((a) => [a.uuid, a.account_name]));
  const allCategories = categories ?? [];
  const parentCategories = allCategories.filter((c) => !c.parent_category_uuid);
  const subcategoryOptions = allCategories.filter(
    (c) => c.parent_category_uuid === filters.category_uuid
  );

  const totalCount = stats?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const rangeStart = totalCount === 0 ? 0 : page * LIMIT + 1;
  const rangeEnd = Math.min((page + 1) * LIMIT, totalCount);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  function setFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPendingSearch('');
  }

  function openCreate() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(tx: TransactionResponse) {
    setEditTarget(tx);
    setFormOpen(true);
  }

  const net = stats ? parseFloat(stats.net) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats ? formatCurrency(stats.total_income) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {stats
                ? formatCurrency(String(Math.abs(parseFloat(stats.total_expenses))))
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stats ? formatCurrency(stats.net) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats ? totalCount.toLocaleString() : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.account_uuid ?? '_all_'}
          onValueChange={(v) => setFilter('account_uuid', v === '_all_' ? undefined : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All accounts</SelectItem>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.uuid} value={a.uuid}>
                {a.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.transaction_type ?? '_all_'}
          onValueChange={(v) => setFilter('transaction_type', v === '_all_' ? undefined : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All types</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category_uuid ?? '_all_'}
          onValueChange={(v) => {
            const val = v === '_all_' ? undefined : v;
            setFilters((prev) => ({ ...prev, category_uuid: val, subcategory_uuid: undefined }));
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All categories</SelectItem>
            {parentCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.subcategory_uuid ?? '_all_'}
          onValueChange={(v) => setFilter('subcategory_uuid', v === '_all_' ? undefined : v)}
          disabled={!filters.category_uuid || subcategoryOptions.length === 0}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All subcategories</SelectItem>
            {subcategoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-36"
          value={filters.date_from ?? ''}
          onChange={(e) => setFilter('date_from', e.target.value || undefined)}
          placeholder="From"
        />
        <Input
          type="date"
          className="w-36"
          value={filters.date_to ?? ''}
          onChange={(e) => setFilter('date_to', e.target.value || undefined)}
          placeholder="To"
        />

        <Input
          className="w-48"
          placeholder="Search description..."
          value={pendingSearch}
          onChange={(e) => setPendingSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setFilter('description_search', pendingSearch || undefined);
            }
          }}
          onBlur={() => setFilter('description_search', pendingSearch || undefined)}
        />

        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading transactions...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load transactions. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !transactions?.length ? (
        <p className="text-sm text-muted-foreground">No transactions found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const amount = parseFloat(tx.amount);
                const isNegative = amount < 0;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(parseISO(tx.transaction_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.merchant_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {accountMap.get(tx.account_uuid) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.category?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.subcategory?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(tx.tags ?? []).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: tag.color,
                              color: '#fff',
                            }}
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        isNegative ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tx.transaction_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tx.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-[160px] truncate text-sm text-muted-foreground"
                      title={tx.comments ?? undefined}
                    >
                      {tx.comments ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {rangeStart}–{rangeEnd} of {totalCount.toLocaleString()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editTarget}
      />
      <DeleteTransactionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        transaction={deleteTarget}
      />
    </div>
  );
}
