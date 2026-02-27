import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Trash2, DollarSign, Percent, CreditCard, Landmark } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useDebtPayments } from '@/hooks/useDebt';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaymentFormDialog } from '@/components/debt/PaymentFormDialog';
import { DeletePaymentDialog } from '@/components/debt/DeletePaymentDialog';
import type { DebtPaymentResponse } from '@/types/debt';

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DebtDetailPage() {
  const { accountUuid } = useParams<{ accountUuid: string }>();
  const { data: accounts } = useAccounts();
  const { data: payments, isLoading, isError } = useDebtPayments(accountUuid ?? '');

  const account = useMemo(
    () => (accounts ?? []).find((a) => a.uuid === accountUuid),
    [accounts, accountUuid],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DebtPaymentResponse | null>(null);

  const sortedPayments = useMemo(
    () =>
      [...(payments ?? [])].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
      ),
    [payments],
  );

  if (!account) {
    return (
      <div className="p-6">
        <Link to="/debt" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Debt
        </Link>
        <p className="text-sm text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <Link
          to="/debt"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Debt
        </Link>
        <h1 className="text-xl font-semibold">{account.account_name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {account.institution_name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Balance"
          value={formatCurrency(account.balance)}
          icon={DollarSign}
        />
        <StatCard
          title="Interest Rate"
          value={
            account.interest_rate
              ? `${(parseFloat(account.interest_rate) * 100).toFixed(2)}%`
              : '—'
          }
          icon={Percent}
        />
        <StatCard
          title="Min Payment"
          value={account.minimum_payment ? formatCurrency(account.minimum_payment) : '—'}
          icon={CreditCard}
        />
        <StatCard
          title="Original Principal"
          value={account.original_principal ? formatCurrency(account.original_principal) : '—'}
          icon={Landmark}
        />
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Record Payment
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load payments.</p>
          ) : sortedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((p) => (
                  <TableRow key={p.uuid}>
                    <TableCell className="tabular-nums">
                      {format(parseISO(p.payment_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(p.payment_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.principal_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.interest_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.remaining_balance)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        loanAccountUuid={accountUuid!}
      />
      <DeletePaymentDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        payment={deleteTarget}
      />
    </div>
  );
}
