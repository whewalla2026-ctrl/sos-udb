'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from './api';

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
  logout: () => void;
  clearError: () => void;
}

var AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  var [user, setUser] = useState<AuthUser | null>(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState<string | null>(null);

  var clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    var token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    api.validate()
      .then(function(data) {
        setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
      })
      .catch(function() {
        var rt = localStorage.getItem('refreshToken');
        if (rt) {
          api.refresh().then(function(data) {
            localStorage.setItem('accessToken', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
          }).catch(function() {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          });
        } else {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      })
      .finally(function() { setLoading(false); });
  }, []);

  var login = useCallback(async function(email: string, password: string) {
    setError(null);
    setLoading(true);
    try {
      var data = await api.login(email, password);
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
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
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser({ userId: data.userId, email: data.email, displayName: data.displayName, role: data.role });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  var logout = useCallback(function() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
