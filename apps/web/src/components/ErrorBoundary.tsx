'use client';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Something went wrong</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
