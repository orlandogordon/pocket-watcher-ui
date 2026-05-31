import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/format';
import { DocumentsList } from '@/components/bulk-uploads/DocumentsList';

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit Card',
  LOAN: 'Loan',
  INVESTMENT: 'Investment',
  OTHER: 'Other',
};

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: accounts, isLoading } = useAccounts();
  const account = accounts?.find((a) => a.id === id);

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!account) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Account not found.</p>
        <Button variant="link" asChild className="px-0">
          <Link to="/accounts">Back to accounts</Link>
        </Button>
      </div>
    );
  }

  const balance = parseFloat(account.balance);
  const isLiability =
    account.account_type === 'LOAN' || account.account_type === 'CREDIT_CARD';
  const isNegative = balance < 0 || (isLiability && balance > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/accounts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Accounts
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{account.account_name}</h1>
              <Badge variant="secondary">
                {TYPE_LABELS[account.account_type] ?? account.account_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {account.institution_name}
              {account.account_number_last4
                ? ` ···· ${account.account_number_last4}`
                : ''}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold tabular-nums ${
                isNegative ? 'text-red-500' : 'text-green-600'
              }`}
            >
              {formatCurrency(account.balance)}
            </p>
            <p className="text-xs text-muted-foreground">Balance</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Statements</CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/onboarding">
              <Upload className="mr-1 h-4 w-4" />
              Upload statements
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DocumentsList accountUuid={account.id} />
        </CardContent>
      </Card>
    </div>
  );
}
