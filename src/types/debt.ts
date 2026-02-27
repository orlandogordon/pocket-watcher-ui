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
  uuid: string;
  loan_account_uuid: string;
  payment_source_account_uuid: string | null;
  payment_amount: string;
  principal_amount: string;
  interest_amount: string;
  remaining_balance: string;
  payment_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
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
