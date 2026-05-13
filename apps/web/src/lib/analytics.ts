var gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

export function trackEvent(event: string, metadata?: Record<string, any>) {
  fetch(gatewayUrl + '/monitoring/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ signal: 'analytics_event', payload: { event, metadata: metadata || {}, timestamp: new Date().toISOString() } }),
  }).catch(function() {});
}
