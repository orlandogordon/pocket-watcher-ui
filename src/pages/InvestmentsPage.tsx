import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useInvestmentHoldings } from '@/hooks/useInvestments';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AccountCard({ account }: { account: { uuid: string; account_name: string; institution_name: string; balance: string } }) {
  const { data: holdings } = useInvestmentHoldings(account.uuid);

  const totalMarketValue = (holdings ?? []).reduce((sum, h) => {
    const price = h.current_price != null ? parseFloat(h.current_price) : NaN;
    return isNaN(price) ? sum : sum + parseFloat(h.quantity) * price;
  }, 0);

  const totalCostBasis = (holdings ?? []).reduce((sum, h) => {
    const price = h.current_price != null ? parseFloat(h.current_price) : NaN;
    // Only include in cost basis if we have a price to compare against
    return isNaN(price) ? sum : sum + parseFloat(h.quantity) * parseFloat(h.average_cost_basis);
  }, 0);

  const unrealizedPL = totalMarketValue - totalCostBasis;

  return (
    <Link to={`/investments/${account.uuid}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{account.account_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{account.institution_name}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
          </div>
          {holdings && holdings.length > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Market Value</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totalMarketValue.toString())}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unrealized P&L</span>
                <span
                  className={`font-medium tabular-nums ${
                    unrealizedPL >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {unrealizedPL >= 0 ? '+' : ''}
                  {formatCurrency(unrealizedPL.toString())}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
              </p>
            </>
          )}
          {holdings && holdings.length === 0 && (
            <p className="text-xs text-muted-foreground">No holdings yet</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function InvestmentsPage() {
  const { data: accounts, isLoading, isError } = useAccounts();

  const investmentAccounts = (accounts ?? []).filter(
    (a) => a.account_type === 'INVESTMENT',
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Investments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Portfolio overview across all investment accounts.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load accounts. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : investmentAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No investment accounts found. Create an account with type{' '}
            <span className="font-medium">INVESTMENT</span> on the{' '}
            <Link to="/accounts" className="text-primary hover:underline">
              Accounts page
            </Link>{' '}
            to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {investmentAccounts.map((account) => (
            <AccountCard key={account.uuid} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
