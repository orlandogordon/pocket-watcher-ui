export interface MonthlyAverageTotals {
  avg_monthly_income: string;
  avg_monthly_expenses: string;
  avg_monthly_net: string;
  total_income: string;
  total_expenses: string;
  total_net: string;
}

export interface MonthlyAverageSubcategoryBreakdown {
  subcategory_uuid: string;
  subcategory_name: string;
  total: string;
  monthly_average: string;
}

export interface MonthlyAverageCategoryBreakdown {
  category_uuid: string;
  category_name: string;
  total: string;
  monthly_average: string;
  subcategories: MonthlyAverageSubcategoryBreakdown[];
}

export interface MonthlyAverageMonthBreakdown {
  month: string;
  income: string;
  expenses: string;
  net: string;
}

export interface MonthlyAverageResponse {
  year: number;
  months_with_data: number;
  totals: MonthlyAverageTotals;
  by_category: MonthlyAverageCategoryBreakdown[];
  by_month: MonthlyAverageMonthBreakdown[];
}
