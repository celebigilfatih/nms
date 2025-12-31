import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const { call } = useApi();

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('current_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuth({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        console.error('Failed to parse stored user data:', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        setAuth(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuth(prev => ({ ...prev, isLoading: true }));

      const response = await call('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      if (response.success && response.data) {
        const { token, user } = response.data as any;

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('current_user', JSON.stringify(user));
        }

        setAuth({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }

      setAuth(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: response.error };
    },
    [call]
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }

    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!auth.user) return false;
      return auth.user.permissions?.includes(permission) || false;
    },
    [auth.user]
  );

  return {
    ...auth,
    login,
    logout,
    hasPermission,
  };
};
