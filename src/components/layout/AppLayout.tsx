import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  TrendingUp,
  CreditCard,
  CalendarRange,
  Upload,
  LineChart,
  Tag,
  FolderOpen,
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/debt', label: 'Debt', icon: CreditCard },
  { to: '/plans', label: 'Plans', icon: CalendarRange },
  { to: '/uploads', label: 'Uploads', icon: Upload },
  { to: '/net-worth', label: 'Net Worth', icon: LineChart },
];

const utilityNav = [
  { to: '/categories', label: 'Categories', icon: FolderOpen },
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/admin', label: 'Admin', icon: Settings },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
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
    </NavLink>
  );
}

const themeOrder = ['system', 'light', 'dark'] as const;
const themeIcon = { system: Monitor, light: Sun, dark: Moon } as const;
const themeLabel = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export function AppLayout() {
  const { theme, setTheme } = useTheme();

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
          {utilityNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <div className="mt-1 flex items-center gap-2 px-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleTheme}>
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{themeLabel[theme]}</span>
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
