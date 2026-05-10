'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  var [email, setEmail] = useState('');
  var [loading, setLoading] = useState(false);
  var [sent, setSent] = useState(false);
  var [error, setError] = useState('');

  var handleSubmit = async function(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 20 }}>
              If an account exists for {email}, we've sent a password reset link. (In dev mode, check the server console.)
            </p>
            <Link href="/auth/login" className="btn btn-primary" style={{ display: 'inline-block' }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
              <input className="input" type="email" placeholder="parent@example.com" value={email} onChange={function(e) { setEmail(e.target.value); }} required />
            </div>

            {error && <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

            <button className="btn btn-primary w-full" type="submit" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link →'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 8 }}>
              <Link href="/auth/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
