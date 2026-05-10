'use client';
import { PackageOpen } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.5 }}>
        {icon || <PackageOpen size={48} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />}
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary">{actionLabel}</Link>
      )}
    </div>
  );
}
