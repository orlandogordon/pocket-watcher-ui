import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, X } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TransactionResponse } from '@/types/transactions';

interface Props {
  value: string | null;
  onChange: (uuid: string | null, tx?: TransactionResponse) => void;
  excludeUuid?: string;
  placeholder?: string;
}

export function TransactionSearchSelect({ value, onChange, excludeUuid, placeholder }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionResponse | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: results } = useTransactions({
    description_search: debouncedSearch || undefined,
    limit: 10,
    order_by: 'transaction_date',
    order_desc: true,
  });

  const filtered = (results ?? []).filter((tx) => tx.id !== excludeUuid);

  function handleSelect(tx: TransactionResponse) {
    setSelectedTx(tx);
    onChange(tx.id, tx);
    setSearch('');
    setOpen(false);
  }

  function handleClear() {
    setSelectedTx(null);
    onChange(null);
    setSearch('');
  }

  if (value && selectedTx) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <div className="flex-1 truncate">
          <span className="font-medium">{selectedTx.description}</span>
          <span className="ml-2 text-muted-foreground">
            {format(parseISO(selectedTx.transaction_date), 'MMM d, yyyy')}
          </span>
          <span className="ml-2">{formatCurrency(selectedTx.amount)}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClear}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={placeholder ?? 'Search transactions...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((tx) => (
            <button
              key={tx.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => handleSelect(tx)}
            >
              <div className="flex-1 truncate">
                <span className="font-medium">{tx.description}</span>
                <span className="ml-2 text-muted-foreground">
                  {format(parseISO(tx.transaction_date), 'MMM d, yyyy')}
                </span>
              </div>
              <span className="shrink-0 tabular-nums">{formatCurrency(tx.amount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
