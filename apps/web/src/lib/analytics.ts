const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '');

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  fetch(apiUrl + '/monitoring/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ signal: 'analytics_event', payload: { event, metadata: metadata || {}, timestamp: new Date().toISOString() } }),
  }).catch(function() {});
}
