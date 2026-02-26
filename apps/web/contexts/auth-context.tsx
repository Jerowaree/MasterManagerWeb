"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  companyId: string;
  branchId?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.auth.me();
      if (response.success) {
        setUser(response.data);
        return;
      }
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const bootstrapSession = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };

    bootstrapSession();
  }, [refreshUser]);

  const login = (nextUser: User) => {
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout; client state should still be cleared.
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      refreshUser,
      isAuthenticated: !!user,
      isLoading,
    }),
    [isLoading, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
