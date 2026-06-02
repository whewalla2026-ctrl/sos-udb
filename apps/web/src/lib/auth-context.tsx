'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, setTokens } from './api';

interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

var AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  var [user, setUser] = useState<AuthUser | null>(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState<string | null>(null);

  var clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    api.validate()
      .then(function(data) {
        setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
      })
      .catch(function() {
        setUser(null);
      })
      .finally(function() { setLoading(false); });
  }, []);

  var login = useCallback(async function(email: string, password: string) {
    setError(null);
    setLoading(true);
    try {
      var data = await api.login(email, password);
      setTokens(data.token, data.refreshToken);
      setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  var register = useCallback(async function(email: string, password: string, displayName: string) {
    setError(null);
    setLoading(true);
    try {
      var data = await api.register(email, password, displayName);
      setTokens(data.token, data.refreshToken);
      setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  var logout = useCallback(async function() {
    try {
      await api.logout();
    } catch {
      // Swallow
    }
    setTokens(null, null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
