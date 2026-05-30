export type DebtStrategy = 'AVALANCHE' | 'SNOWBALL' | 'CUSTOM';

export interface DebtAccountInput {
  uuid: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

export interface CalculatorConfig {
  strategy: DebtStrategy;
  defaultMonthlyBudget: number;
  monthlyOverrides: Map<string, Map<string, number>>;
}

export interface AccountMonthEntry {
  accountUuid: string;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
}

export interface MonthEntry {
  month: string;
  accounts: AccountMonthEntry[];
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  totalRemainingBalance: number;
}

export interface AccountPayoffSummary {
  accountUuid: string;
  accountName: string;
  startingBalance: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffDate: string;
  payoffMonths: number;
}

export interface PayoffSchedule {
  months: MonthEntry[];
  accountSummaries: AccountPayoffSummary[];
  totalInterestPaid: number;
  totalPaid: number;
  finalPayoffDate: string;
  totalMonths: number;
}

export interface DebtPaymentResponse {
  id: string;
  loan_account_uuid: string;
  payment_source_account_uuid: string | null;
  transaction_uuid: string | null;
  payment_amount: string;
  principal_amount: string;
  interest_amount: string;
  remaining_balance_after_payment: string;
  payment_date: string;
  description: string | null;
  created_at: string;
}

export interface DebtPaymentCreate {
  loan_account_uuid: string;
  payment_amount: string;
  payment_date: string;
  payment_source_account_uuid?: string;
  principal_amount?: string;
  interest_amount?: string;
  description?: string;
}
