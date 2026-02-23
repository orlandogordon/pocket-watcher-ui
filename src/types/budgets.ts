export interface BudgetCategory {
  id: string;
  name: string;
  parent_category_uuid: string | null;
}

export interface BudgetCategoryResponse {
  id: string;
  category: BudgetCategory;
  allocated_amount: string;
  spent_amount: string | null;
  remaining_amount: string | null;
  percentage_used: number | null;
  created_at: string;
}

export interface BudgetResponse {
  id: string;
  budget_name: string;
  start_date: string;
  end_date: string;
  total_allocated: string;
  total_spent: string;
  total_remaining: string;
  percentage_used: number;
  is_active: boolean;
  budget_categories: BudgetCategoryResponse[];
  created_at: string;
  updated_at: string;
}
