import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { getStoredToken, setStoredToken, clearStoredToken } from '@/lib/auth-storage';
import type { LoginRequest, LoginResponse, UserResponse } from '@/types/auth';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const validate = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await apiFetch<UserResponse>('/auth/me');
      setUser(me);
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const login = useCallback(async (credentials: LoginRequest) => {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.access_token);
    const me = await apiFetch<UserResponse>('/auth/me');
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    window.location.href = '/sign-in';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
