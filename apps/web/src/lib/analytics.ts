export function trackEvent(event: string, metadata?: Record<string, any>) {
  var token = localStorage.getItem('accessToken');
  if (!token) return;
  fetch('http://localhost:3000/monitoring/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ signal: 'analytics_event', payload: { event, metadata: metadata || {}, timestamp: new Date().toISOString() } }),
  }).catch(function() {});
}
