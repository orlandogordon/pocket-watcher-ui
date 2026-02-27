export type ExpenseType = 'recurring' | 'one_time';

export interface FinancialPlanExpenseResponse {
  id: string;
  category_uuid: string | null;
  description: string;
  amount: string;
  expense_type: ExpenseType;
}

export interface FinancialPlanMonthResponse {
  id: string;
  year: number;
  month: number;
  planned_income: string;
  expenses: FinancialPlanExpenseResponse[];
}

export interface FinancialPlanResponse {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  monthly_periods: FinancialPlanMonthResponse[];
  created_at: string;
}

export interface FinancialPlanCreate {
  plan_name: string;
  start_date: string;
  end_date: string;
}

export interface FinancialPlanUpdate {
  plan_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface FinancialPlanExpenseCreate {
  category_uuid: string;
  description: string;
  amount: string;
  expense_type: ExpenseType;
}

export interface FinancialPlanMonthCreate {
  year: number;
  month: number;
  planned_income: string;
  expenses?: FinancialPlanExpenseCreate[];
}

export interface FinancialPlanMonthUpdate {
  planned_income?: string;
}

export interface MonthlyPlanSummary {
  year: number;
  month: number;
  planned_income: string;
  total_expenses: string;
  net_surplus: string;
}

export interface FinancialPlanSummary {
  id: string;
  plan_name: string;
  total_planned_income: string;
  total_planned_expenses: string;
  total_net_surplus: string;
  total_months: number;
  monthly_summaries: MonthlyPlanSummary[];
}
