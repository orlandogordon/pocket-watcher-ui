import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
