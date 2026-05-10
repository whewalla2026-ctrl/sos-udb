'use client';

interface LoadingStateProps {
  count?: number;
  height?: number;
}

export function LoadingState({ count = 3, height = 100 }: LoadingStateProps) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map(function(_, i) {
        return <div key={i} className="glass-card" style={{ padding: 24, height, background: 'var(--bg-glass)', animation: 'pulse 2s ease-in-out infinite' }} />;
      })}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
