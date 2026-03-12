// Templates
export interface BudgetTemplateCreate {
  template_name: string;
  is_default?: boolean;
  categories?: BudgetTemplateCategoryCreate[];
}

export interface BudgetTemplateUpdate {
  template_name?: string;
  is_default?: boolean;
}

export interface BudgetTemplateCategoryCreate {
  category_uuid: string;
  subcategory_uuid?: string | null;
  allocated_amount: string;
}

export interface BudgetTemplateCategoryUpdate {
  allocated_amount: string;
}

export interface BudgetCategoryRef {
  id: string;
  name: string;
  parent_category_uuid: string | null;
}

export interface BudgetTemplateCategoryResponse {
  id: string;
  category: BudgetCategoryRef;
  subcategory: BudgetCategoryRef | null;
  allocated_amount: string;
  created_at: string;
}

export interface BudgetTemplateResponse {
  id: string;
  template_name: string;
  is_default: boolean;
  categories: BudgetTemplateCategoryResponse[];
  created_at: string;
  updated_at: string;
}

// Months
export interface BudgetMonthAssign {
  template_uuid: string | null;
}

export interface BudgetMonthResponse {
  id: string;
  year: number;
  month: number;
  template: BudgetTemplateResponse | null;
  created_at: string;
}

// Stats
export interface BudgetMonthStats {
  id: string;
  year: number;
  month: number;
  template_name: string;
  period_days: number;
  days_remaining: number;
  categories_count: number;
  categories_over_budget: number;
  categories_on_track: number;
  categories_under_budget: number;
  biggest_overspend_category: string | null;
  biggest_overspend_amount: string | null;
  most_efficient_category: string | null;
  daily_burn_rate: string;
  projected_total_spend: string;
}

// Performance
export interface BudgetPerformanceItem {
  category_uuid: string;
  category_name: string;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
  allocated_amount: string;
  spent_amount: string;
  remaining_amount: string;
  percentage_used: number;
  status: string;
  daily_average: string;
  projected_spend: string;
}
