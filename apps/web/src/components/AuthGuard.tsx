'use client';

import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  var { user, loading } = useAuth();
  var router = useRouter();

  useEffect(function() {
    if (!loading && !user) { router.replace('/auth/login'); }
    if (!loading && user && requiredRole && user.role !== requiredRole) { router.replace('/dashboard'); }
  }, [loading, user, router, requiredRole]);

  if (loading) return <div className="fade-in" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}
