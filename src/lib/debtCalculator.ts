import type {
  DebtAccountInput,
  CalculatorConfig,
  PayoffSchedule,
  MonthEntry,
  AccountMonthEntry,
  AccountPayoffSummary,
} from '@/types/debt';

const MAX_MONTHS = 360;

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculatePayoffSchedule(
  accounts: DebtAccountInput[],
  config: CalculatorConfig,
): PayoffSchedule | null {
  if (accounts.length === 0 || config.defaultMonthlyBudget <= 0) return null;

  const balances = new Map<string, number>();
  const interestTotals = new Map<string, number>();
  const paymentTotals = new Map<string, number>();
  const payoffDates = new Map<string, { month: string; months: number }>();

  for (const a of accounts) {
    balances.set(a.uuid, a.balance);
    interestTotals.set(a.uuid, 0);
    paymentTotals.set(a.uuid, 0);
  }

  const months: MonthEntry[] = [];
  const now = new Date();
  let currentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  for (let monthIdx = 0; monthIdx < MAX_MONTHS; monthIdx++) {
    const monthKey = formatMonth(currentDate);
    const activeAccounts = accounts.filter((a) => (balances.get(a.uuid) ?? 0) > 0);
    if (activeAccounts.length === 0) break;

    const monthOverrides = config.monthlyOverrides.get(monthKey);
    const accountEntries: AccountMonthEntry[] = [];

    // Calculate interest for each active account
    const interestMap = new Map<string, number>();
    for (const a of activeAccounts) {
      const bal = balances.get(a.uuid)!;
      const monthlyRate = a.interestRate / 100 / 12;
      interestMap.set(a.uuid, round2(bal * monthlyRate));
    }

    // Total minimum payments required
    const totalMinRequired = activeAccounts.reduce((sum, a) => {
      const bal = balances.get(a.uuid)!;
      const interest = interestMap.get(a.uuid)!;
      const minPayment = Math.min(a.minimumPayment, bal + interest);
      return sum + minPayment;
    }, 0);

    const budget = config.defaultMonthlyBudget;
    const availableBudget = Math.max(budget, totalMinRequired);

    // Phase 1: Apply minimum payments
    const payments = new Map<string, number>();
    let spent = 0;

    for (const a of activeAccounts) {
      const bal = balances.get(a.uuid)!;
      const interest = interestMap.get(a.uuid)!;
      const minPayment = Math.min(a.minimumPayment, bal + interest);
      payments.set(a.uuid, minPayment);
      spent += minPayment;
    }

    // Phase 2: Distribute extra budget
    let extra = availableBudget - spent;

    if (config.strategy === 'CUSTOM') {
      // In custom mode, apply explicit overrides first, then distribute remainder
      // Reset: recalculate spent based on overrides replacing minimums
      if (monthOverrides) {
        for (const a of activeAccounts) {
          const override = monthOverrides.get(a.uuid);
          if (override !== undefined) {
            const bal = balances.get(a.uuid)!;
            const interest = interestMap.get(a.uuid)!;
            const maxPayment = bal + interest;
            const oldPmt = payments.get(a.uuid)!;
            const minPmt = Math.min(a.minimumPayment, maxPayment);
            const newPmt = round2(Math.max(minPmt, Math.min(override, maxPayment)));
            payments.set(a.uuid, newPmt);
            spent += newPmt - oldPmt;
          }
        }
        extra = Math.max(0, availableBudget - spent);
      }
      // Distribute remainder to non-overridden accounts by highest rate
      const nonOverridden = [...activeAccounts]
        .filter((a) => !monthOverrides?.has(a.uuid))
        .sort((a, b) => b.interestRate - a.interestRate);
      for (const a of nonOverridden) {
        if (extra <= 0) break;
        const bal = balances.get(a.uuid)!;
        const interest = interestMap.get(a.uuid)!;
        const maxPayment = bal + interest;
        const currentPmt = payments.get(a.uuid)!;
        const room = maxPayment - currentPmt;
        if (room > 0) {
          const additional = Math.min(room, extra);
          payments.set(a.uuid, currentPmt + additional);
          extra -= additional;
        }
      }
    } else {
      // Avalanche or Snowball
      const sorted = [...activeAccounts].sort((a, b) => {
        if (config.strategy === 'AVALANCHE') return b.interestRate - a.interestRate;
        return (balances.get(a.uuid)!) - (balances.get(b.uuid)!);
      });

      for (const a of sorted) {
        if (extra <= 0) break;
        const bal = balances.get(a.uuid)!;
        const interest = interestMap.get(a.uuid)!;
        const maxPayment = bal + interest;
        const currentPmt = payments.get(a.uuid)!;
        const room = maxPayment - currentPmt;
        if (room > 0) {
          const additional = Math.min(room, extra);
          payments.set(a.uuid, currentPmt + additional);
          extra -= additional;
        }
      }
    }

    // Apply payments and build entries
    let totalPayment = 0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalRemaining = 0;

    for (const a of accounts) {
      const bal = balances.get(a.uuid) ?? 0;
      if (bal <= 0) {
        // Already paid off — include zero entry
        accountEntries.push({
          accountUuid: a.uuid,
          payment: 0,
          interest: 0,
          principal: 0,
          remainingBalance: 0,
        });
        continue;
      }

      const payment = round2(payments.get(a.uuid) ?? 0);
      const interest = interestMap.get(a.uuid)!;
      const principal = round2(Math.max(payment - interest, 0));
      const newBalance = round2(Math.max(bal - principal, 0));

      balances.set(a.uuid, newBalance);
      interestTotals.set(a.uuid, (interestTotals.get(a.uuid) ?? 0) + interest);
      paymentTotals.set(a.uuid, (paymentTotals.get(a.uuid) ?? 0) + payment);

      if (newBalance <= 0 && !payoffDates.has(a.uuid)) {
        payoffDates.set(a.uuid, { month: monthKey, months: monthIdx + 1 });
      }

      totalPayment += payment;
      totalInterest += interest;
      totalPrincipal += principal;
      totalRemaining += newBalance;

      accountEntries.push({
        accountUuid: a.uuid,
        payment,
        interest,
        principal,
        remainingBalance: newBalance,
      });
    }

    months.push({
      month: monthKey,
      accounts: accountEntries,
      totalPayment: round2(totalPayment),
      totalInterest: round2(totalInterest),
      totalPrincipal: round2(totalPrincipal),
      totalRemainingBalance: round2(totalRemaining),
    });

    if (totalRemaining <= 0) break;

    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  const accountSummaries: AccountPayoffSummary[] = accounts.map((a) => {
    const pd = payoffDates.get(a.uuid);
    return {
      accountUuid: a.uuid,
      accountName: a.name,
      startingBalance: a.balance,
      totalInterestPaid: round2(interestTotals.get(a.uuid) ?? 0),
      totalPaid: round2(paymentTotals.get(a.uuid) ?? 0),
      payoffDate: pd?.month ?? 'N/A',
      payoffMonths: pd?.months ?? 0,
    };
  });

  const lastMonth = months[months.length - 1];

  return {
    months,
    accountSummaries,
    totalInterestPaid: round2(accountSummaries.reduce((s, a) => s + a.totalInterestPaid, 0)),
    totalPaid: round2(accountSummaries.reduce((s, a) => s + a.totalPaid, 0)),
    finalPayoffDate: lastMonth?.month ?? '',
    totalMonths: months.length,
  };
}
