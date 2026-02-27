import { Fragment, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, CreditCard, Percent, Calculator } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { calculatePayoffSchedule } from '@/lib/debtCalculator';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Button } from '@/components/ui/button';
import type { AccountResponse } from '@/types/accounts';
import type { DebtStrategy, DebtAccountInput } from '@/types/debt';

// Plain-object override map: { "2026-03::uuid-1": 500 }
type Overrides = Record<string, number>;

function overrideKey(month: string, accountUuid: string) {
  return `${month}::${accountUuid}`;
}

function overridesToMap(overrides: Overrides): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  for (const [key, value] of Object.entries(overrides)) {
    const [month, uuid] = key.split('::');
    if (!result.has(month)) result.set(month, new Map());
    result.get(month)!.set(uuid, value);
  }
  return result;
}

function toDebtInput(a: AccountResponse): DebtAccountInput {
  return {
    uuid: a.uuid,
    name: a.account_name,
    balance: parseFloat(a.balance),
    interestRate: a.interest_rate ? parseFloat(a.interest_rate) * 100 : 0,
    minimumPayment: a.minimum_payment ? parseFloat(a.minimum_payment) : 0,
  };
}

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

function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function DebtPage() {
  const { data: allAccounts, isLoading, isError } = useAccounts();

  const debtAccounts = useMemo(
    () =>
      (allAccounts ?? []).filter((a) => a.account_type === 'LOAN'),
    [allAccounts],
  );

  // Summary stats
  const totalDebt = debtAccounts.reduce((s, a) => s + parseFloat(a.balance), 0);
  const totalMinPayments = debtAccounts.reduce(
    (s, a) => s + (a.minimum_payment ? parseFloat(a.minimum_payment) : 0),
    0,
  );
  const avgRate = useMemo(() => {
    const withRate = debtAccounts.filter((a) => a.interest_rate);
    if (withRate.length === 0) return 0;
    const totalBal = withRate.reduce((s, a) => s + parseFloat(a.balance), 0);
    if (totalBal === 0) return 0;
    return withRate.reduce(
      (s, a) => s + parseFloat(a.interest_rate!) * 100 * (parseFloat(a.balance) / totalBal),
      0,
    );
  }, [debtAccounts]);

  // Calculator state
  const [strategy, setStrategy] = useState<DebtStrategy>('AVALANCHE');
  const [budgetInput, setBudgetInput] = useState('');
  const [selectedUuids, setSelectedUuids] = useState<Set<string> | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  // Bump to force recalculation after committing overrides
  const [calcVersion, setCalcVersion] = useState(0);

  const effectiveSelected = selectedUuids ?? new Set(debtAccounts.map((a) => a.uuid));
  const budget = parseFloat(budgetInput) || 0;

  const selectedInputs = useMemo(
    () =>
      debtAccounts
        .filter((a) => effectiveSelected.has(a.uuid))
        .map(toDebtInput),
    [debtAccounts, effectiveSelected],
  );

  const overridesMap = useMemo(() => overridesToMap(overrides), [overrides]);

  const schedule = useMemo(
    () => calculatePayoffSchedule(selectedInputs, { strategy, defaultMonthlyBudget: budget, monthlyOverrides: overridesMap }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedInputs, strategy, budget, overridesMap, calcVersion],
  );

  function toggleAccount(uuid: string) {
    const next = new Set(effectiveSelected);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setSelectedUuids(next);
  }

  function commitOverride(month: string, accountUuid: string, value: string) {
    const raw = parseFloat(value);
    const acct = selectedInputs.find((a) => a.uuid === accountUuid);
    const min = acct?.minimumPayment ?? 0;
    setOverrides((prev) => {
      const k = overrideKey(month, accountUuid);
      if (isNaN(raw) || value === '') {
        const { [k]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [k]: Math.max(raw, min) };
    });
    setCalcVersion((v) => v + 1);
  }

  function resetOverrides() {
    setOverrides({});
    setCalcVersion((v) => v + 1);
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">
          Failed to load accounts. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Debt Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your debt accounts and plan your payoff.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Debt"
          value={formatCurrency(totalDebt.toString())}
          icon={DollarSign}
        />
        <StatCard
          title="Accounts"
          value={debtAccounts.length.toString()}
          icon={CreditCard}
        />
        <StatCard
          title="Avg Rate"
          value={`${avgRate.toFixed(2)}%`}
          icon={Percent}
        />
        <StatCard
          title="Min Payments"
          value={formatCurrency(totalMinPayments.toString())}
          icon={DollarSign}
        />
      </div>

      {/* Debt Accounts Table */}
      {debtAccounts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Debt Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Min Payment</TableHead>
                  <TableHead>Institution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtAccounts.map((a) => (
                  <TableRow key={a.uuid}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/debt/${a.uuid}`}
                        className="hover:underline"
                      >
                        {a.account_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(a.balance)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.interest_rate ? `${(parseFloat(a.interest_rate) * 100).toFixed(2)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.minimum_payment ? formatCurrency(a.minimum_payment) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.institution_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No debt accounts found. Add a Loan or Credit Card account to get started.
          </p>
        </div>
      )}

      {/* Payoff Calculator */}
      {debtAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Payoff Calculator</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Project payoff timelines for your loan accounts.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="strategy">Strategy</Label>
                <Select
                  value={strategy}
                  onValueChange={(v) => setStrategy(v as DebtStrategy)}
                >
                  <SelectTrigger id="strategy" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVALANCHE">Avalanche</SelectItem>
                    <SelectItem value="SNOWBALL">Snowball</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget">Monthly Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="budget"
                    type="number"
                    min={0}
                    step={50}
                    placeholder="0.00"
                    className="w-[160px] pl-7 tabular-nums"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                </div>
              </div>
              {strategy === 'CUSTOM' && hasOverrides && (
                <Button variant="outline" size="sm" onClick={resetOverrides}>
                  Reset Overrides
                </Button>
              )}
            </div>

            {/* Account Selection */}
            <div className="space-y-2">
              <Label>Accounts</Label>
              <div className="flex flex-wrap gap-4">
                {debtAccounts.map((a) => (
                  <label
                    key={a.uuid}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={effectiveSelected.has(a.uuid)}
                      onCheckedChange={() => toggleAccount(a.uuid)}
                    />
                    <span>{a.account_name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      ({formatCurrency(a.balance)})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Results */}
            {schedule && (
              <>
                {/* Calculator Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Payoff Date</p>
                      <p className="text-xl font-bold tabular-nums">
                        {formatMonth(schedule.finalPayoffDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.totalMonths} months
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Interest</p>
                      <p className="text-xl font-bold tabular-nums">
                        {formatCurrency(schedule.totalInterestPaid.toString())}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-bold tabular-nums">
                        {formatCurrency(schedule.totalPaid.toString())}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Per-Account Summary Table */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Per-Account Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Starting Balance</TableHead>
                        <TableHead className="text-right">Total Interest</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead className="text-right">Payoff Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.accountSummaries.map((s) => (
                        <TableRow key={s.accountUuid}>
                          <TableCell className="font-medium">{s.accountName}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(s.startingBalance.toString())}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(s.totalInterestPaid.toString())}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(s.totalPaid.toString())}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.payoffDate !== 'N/A' ? formatMonth(s.payoffDate) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Month-by-Month Schedule */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Month-by-Month Schedule</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScheduleExpanded(!scheduleExpanded)}
                    >
                      {scheduleExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                  <div
                    className={cn(
                      'overflow-auto border rounded-md',
                      !scheduleExpanded && 'max-h-[400px]',
                    )}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">
                            Month
                          </TableHead>
                          {selectedInputs.map((a) => (
                            <TableHead
                              key={a.uuid}
                              colSpan={3}
                              className="text-center border-l"
                            >
                              {a.name}
                            </TableHead>
                          ))}
                          <TableHead className="text-right border-l">Total</TableHead>
                        </TableRow>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10" />
                          {selectedInputs.map((a) => (
                            <Fragment key={a.uuid}>
                              <TableHead className="text-right border-l text-xs">
                                Pmt
                              </TableHead>
                              <TableHead className="text-right text-xs">Int</TableHead>
                              <TableHead className="text-right text-xs">Bal</TableHead>
                            </Fragment>
                          ))}
                          <TableHead className="text-right border-l text-xs">Pmt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.months.map((m) => (
                          <TableRow key={m.month}>
                            <TableCell className="sticky left-0 bg-background z-10 whitespace-nowrap text-xs tabular-nums">
                              {formatMonth(m.month)}
                            </TableCell>
                            {selectedInputs.map((a) => {
                              const entry = m.accounts.find(
                                (e) => e.accountUuid === a.uuid,
                              );
                              if (!entry) return <Fragment key={a.uuid}><TableCell colSpan={3} className="border-l" /></Fragment>;
                              const isCustom = strategy === 'CUSTOM';
                              const oKey = overrideKey(m.month, a.uuid);

                              return (
                                <Fragment key={a.uuid}>
                                  <TableCell className="text-right tabular-nums text-xs border-l p-1">
                                    {isCustom ? (
                                      <Input
                                        type="number"
                                        min={a.minimumPayment}
                                        step={10}
                                        className="w-20 h-6 text-xs tabular-nums text-right p-1"
                                        defaultValue={overrides[oKey] ?? ''}
                                        placeholder={entry.payment.toFixed(0)}
                                        key={`${oKey}-${calcVersion}`}
                                        onBlur={(e) =>
                                          commitOverride(m.month, a.uuid, e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                      />
                                    ) : (
                                      formatCurrency(entry.payment.toString())
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs p-1">
                                    {formatCurrency(entry.interest.toString())}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs p-1">
                                    {formatCurrency(
                                      entry.remainingBalance.toString(),
                                    )}
                                  </TableCell>
                                </Fragment>
                              );
                            })}
                            <TableCell className="text-right tabular-nums text-xs border-l font-medium">
                              {formatCurrency(m.totalPayment.toString())}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}

            {!schedule && budget > 0 && effectiveSelected.size > 0 && (
              <p className="text-sm text-muted-foreground">
                No schedule could be generated.
              </p>
            )}

            {budget <= 0 && (
              <p className="text-sm text-muted-foreground">
                Enter a monthly budget to see your payoff projection.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
