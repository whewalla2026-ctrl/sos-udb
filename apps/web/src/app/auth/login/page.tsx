'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';

export default function LoginPage() {
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [error, setError] = useState<string | null>(null);
  var [loading, setLoading] = useState(false);
  var { login } = useAuth();
  var router = useRouter();

  var handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in">
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, color: '#FCA5A5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌟</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Sign in to your UDB family account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
            <input
              id="email-input"
              className="input"
              type="email"
              placeholder="parent@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
              <a href="/auth/forgot-password" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontSize: '0.8125rem' }}>Forgot password?</a>
            </label>
            <input
              id="password-input"
              className="input"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button id="login-btn" className="btn btn-primary w-full" type="submit" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Signing in…
              </span>
            ) : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 24 }}>
          New to UDB?{' '}
          <Link href="/auth/register" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Create a family account</Link>
        </p>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
