import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Inbox,
  PiggyBank,
  TrendingUp,
  CreditCard,
  CalendarRange,
  Upload,
  LineChart,
  BarChart3,
  Tag,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useAttentionCount } from '@/hooks/useDataHealth';
import { Button } from '@/components/ui/button';

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'attention' as const },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/debt', label: 'Debt', icon: CreditCard },
  { to: '/plans', label: 'Plans', icon: CalendarRange },
  { to: '/uploads', label: 'Uploads', icon: Upload },
  { to: '/net-worth', label: 'Net Worth', icon: LineChart },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const utilityNav = [
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
];

function AttentionBadge() {
  // Fixed-width slot so the badge appearing later does not reflow the row.
  // Backend /count is ~2s warm; render the slot empty until it lands.
  const { data } = useAttentionCount();
  const total = data?.total ?? null;
  return (
    <span className="ml-auto inline-flex w-7 justify-end">
      {total !== null && total > 0 && (
        <span
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500/90 px-1.5 text-[10px] font-semibold text-white"
          title={`${total} item${total === 1 ? '' : 's'} need attention`}
        >
          {total > 999 ? '999+' : total}
        </span>
      )}
    </span>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: 'attention';
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {badge === 'attention' && <AttentionBadge />}
    </NavLink>
  );
}

const themeOrder = ['system', 'light', 'dark'] as const;
const themeIcon = { system: Monitor, light: Sun, dark: Moon } as const;
const themeLabel = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export function AppLayout() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: accounts, isSuccess } = useAccounts();

  // New users land in the onboarding wizard the first time they have no
  // accounts — unless they chose "Skip for now" this session.
  useEffect(() => {
    if (
      isSuccess &&
      accounts &&
      accounts.length === 0 &&
      !sessionStorage.getItem('pw_onboarding_skipped')
    ) {
      navigate('/onboarding', { replace: true });
    }
  }, [isSuccess, accounts, navigate]);

  function cycleTheme() {
    const idx = themeOrder.indexOf(theme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]);
  }

  const ThemeIcon = themeIcon[theme];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold tracking-tight">Pocket Watcher</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t p-3 flex flex-col gap-1">
          {utilityNav
            .filter((item) => !item.adminOnly || user?.is_admin)
            .map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          <div className="mt-1 flex items-center gap-2 px-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleTheme}>
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{themeLabel[theme]}</span>
          </div>
          {user && (
            <div className="mt-2 flex items-center justify-between px-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.username}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
