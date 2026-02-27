import { useState } from 'react';
import { useAccounts, useAccountStats } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/format';
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog';
import { DeleteAccountDialog } from '@/components/accounts/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { AccountResponse } from '@/types/accounts';

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit Card',
  LOAN: 'Loan',
  INVESTMENT: 'Investment',
  OTHER: 'Other',
};

export function AccountsPage() {
  const { data: accounts, isLoading, isError } = useAccounts();
  const { data: stats } = useAccountStats();

  const [formOpen, setFormOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<AccountResponse | null>(null);

  function openCreate() {
    setEditAccount(undefined);
    setFormOpen(true);
  }

  function openEdit(account: AccountResponse) {
    setEditAccount(account);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? formatCurrency(stats.net_worth) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats ? formatCurrency(stats.total_assets) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {stats ? formatCurrency(stats.total_liabilities) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Accounts</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load accounts. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !accounts?.length ? (
        <p className="text-sm text-muted-foreground">No accounts yet. Add one to get started.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Last 4</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const balance = parseFloat(account.balance);
                const isLiability = account.account_type === 'LOAN' || account.account_type === 'CREDIT_CARD';
                const isNegative = balance < 0 || (isLiability && balance > 0);
                return (
                  <TableRow key={account.uuid}>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TYPE_LABELS[account.account_type] ?? account.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{account.institution_name}</TableCell>
                    <TableCell>{account.account_number_last4 ?? '—'}</TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        isNegative ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(account)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(account)}
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

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editAccount}
      />
      <DeleteAccountDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        account={deleteTarget}
      />
    </div>
  );
}
