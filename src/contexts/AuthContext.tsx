import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { getStoredToken, setStoredToken, clearStoredToken } from '@/lib/auth-storage';
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demo';
import type { LoginRequest, LoginResponse, UserResponse } from '@/types/auth';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  /** Demo-mode only: auto-login exhausted its retries (e.g. mid daily reset). */
  demoAuthFailed: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  /** Demo-mode only: re-attempt auto-login from the "warming up" screen. */
  retryDemoLogin: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const DEMO_LOGIN_RETRIES = 5;
const DEMO_LOGIN_BACKOFF_MS = 1500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoAuthFailed, setDemoAuthFailed] = useState(false);

  const doLogin = useCallback(async (credentials: LoginRequest) => {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.access_token);
    const me = await apiFetch<UserResponse>('/auth/me');
    setUser(me);
  }, []);

  // In demo mode there's no sign-in screen — auto-log-in as the seeded throwaway
  // user. The daily wipe-and-seed can briefly 401/500, so retry with backoff
  // rather than dumping the visitor at an auth wall.
  const demoLogin = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < DEMO_LOGIN_RETRIES; attempt++) {
      try {
        await doLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        return true;
      } catch {
        if (attempt < DEMO_LOGIN_RETRIES - 1) await sleep(DEMO_LOGIN_BACKOFF_MS);
      }
    }
    return false;
  }, [doLogin]);

  const validate = useCallback(async () => {
    const token = getStoredToken();

    // No session and nothing to auto-login with — settle synchronously.
    if (!token && !DEMO_MODE) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      if (token) {
        try {
          const me = await apiFetch<UserResponse>('/auth/me');
          setUser(me);
          return;
        } catch {
          clearStoredToken();
        }
      }

      // Demo mode (no token, or the stored one was rejected): auto-login.
      const ok = await demoLogin();
      if (!ok) {
        setUser(null);
        setDemoAuthFailed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [demoLogin]);

  // Boot validation
  useEffect(() => {
    validate();
  }, [validate]);

  // Multi-tab sync — if another tab clears the token, sign out here too
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'pocket_watcher_token' && !e.newValue) {
        setUser(null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      await doLogin(credentials);
    },
    [doLogin],
  );

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    window.location.href = '/sign-in';
  }, []);

  const retryDemoLogin = useCallback(() => {
    setDemoAuthFailed(false);
    setIsLoading(true);
    validate();
  }, [validate]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, demoAuthFailed, login, logout, retryDemoLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
