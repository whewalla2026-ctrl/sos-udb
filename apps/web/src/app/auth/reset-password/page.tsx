'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  var [token, setToken] = useState('');
  var [newPassword, setNewPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(false);
  var [error, setError] = useState('');

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var t = params.get('token');
    if (t) setToken(t);
  }, []);

  var handleSubmit = async function(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      var res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword }) });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Password reset service is not available. Please contact support.');
        var err = await res.json().catch(() => ({ error: 'Reset failed' }));
        throw new Error(err.error || 'Reset failed');
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Choose New Password
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Enter your new password below</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 20 }}>Your password has been reset successfully. You can now log in with your new password.</p>
            <Link href="/auth/login" className="btn btn-primary" style={{ display: 'inline-block' }}>Log In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>New Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={newPassword} onChange={function(e) { setNewPassword(e.target.value); }} required minLength={8} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Confirm Password</label>
              <input className="input" type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={function(e) { setConfirmPassword(e.target.value); }} required />
            </div>

            {error && <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

            <button className="btn btn-primary w-full" type="submit" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password →'}
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
