import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_MODE } from '@/lib/demo';
import { Button } from '@/components/ui/button';

export function RequireAuth() {
  const { user, isLoading, demoAuthFailed, retryDemoLogin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {DEMO_MODE ? 'Warming up the demo…' : 'Loading...'}
        </p>
      </div>
    );
  }

  // Demo mode has no sign-in screen — if auto-login exhausted its retries
  // (e.g. mid daily reset), offer a soft retry instead of an auth wall.
  if (DEMO_MODE && !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium">The demo is warming up</p>
          <p className="text-sm text-muted-foreground">
            {demoAuthFailed
              ? 'The shared demo data resets daily and may be rebuilding. Give it a moment.'
              : 'Just a moment…'}
          </p>
        </div>
        <Button onClick={retryDemoLogin}>Try again</Button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}
