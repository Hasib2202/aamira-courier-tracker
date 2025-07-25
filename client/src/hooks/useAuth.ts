
// src/hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { User } from '../types/package';

interface AuthState {
  user: User | null;
  token: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
  });

  const login = useCallback((user: User, token: string) => {
    setAuth({ user, token });
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setAuth({ user: null, token: null });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  return {
    ...auth,
    login,
    logout,
  };
}
