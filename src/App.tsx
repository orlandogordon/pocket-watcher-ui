import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { TagsPage } from '@/pages/TagsPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { BudgetDetailPage } from '@/pages/BudgetDetailPage';
import { UploadsPage } from '@/pages/UploadsPage';
import { UploadHistoryPage } from '@/pages/UploadHistoryPage';
import { InvestmentsPage } from '@/pages/InvestmentsPage';
import { InvestmentDetailPage } from '@/pages/InvestmentDetailPage';
import { DebtPage } from '@/pages/DebtPage';
import { DebtDetailPage } from '@/pages/DebtDetailPage';
import { PlansPage } from '@/pages/PlansPage';
import { PlanDetailPage } from '@/pages/PlanDetailPage';
import { NetWorthPage } from '@/pages/NetWorthPage';
import { AdminPage } from '@/pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="budgets/:uuid" element={<BudgetDetailPage />} />
          <Route path="uploads" element={<UploadsPage />} />
          <Route path="uploads/history" element={<UploadHistoryPage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="investments/:accountUuid" element={<InvestmentDetailPage />} />
          <Route path="debt" element={<DebtPage />} />
          <Route path="debt/:accountUuid" element={<DebtDetailPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="plans/:uuid" element={<PlanDetailPage />} />
          <Route path="net-worth" element={<NetWorthPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
