import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { SignInPage } from '@/pages/SignInPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { AccountDetailPage } from '@/pages/AccountDetailPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { InboxPage } from '@/pages/InboxPage';
import { TagsPage } from '@/pages/TagsPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { BudgetTemplatesPage } from '@/pages/BudgetTemplatesPage';
import { UploadsPage } from '@/pages/UploadsPage';
import { UploadHistoryPage } from '@/pages/UploadHistoryPage';
import { InvestmentsPage } from '@/pages/InvestmentsPage';
import { InvestmentDetailPage } from '@/pages/InvestmentDetailPage';
import { DebtPage } from '@/pages/DebtPage';
import { DebtDetailPage } from '@/pages/DebtDetailPage';
import { PlansPage } from '@/pages/PlansPage';
import { PlanDetailPage } from '@/pages/PlanDetailPage';
import { NetWorthPage } from '@/pages/NetWorthPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AdminPage } from '@/pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route element={<RequireAuth />}>
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/:id" element={<AccountDetailPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="budgets/templates" element={<BudgetTemplatesPage />} />
              <Route path="uploads" element={<UploadsPage />} />
              <Route path="uploads/history" element={<UploadHistoryPage />} />
              <Route path="investments" element={<InvestmentsPage />} />
              <Route path="investments/:accountUuid" element={<InvestmentDetailPage />} />
              <Route path="debt" element={<DebtPage />} />
              <Route path="debt/:accountUuid" element={<DebtDetailPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="plans/:uuid" element={<PlanDetailPage />} />
              <Route path="net-worth" element={<NetWorthPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
