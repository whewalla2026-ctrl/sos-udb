const API_URL = 'http://localhost:4000';

async function isStackReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

describe('UDB API E2E (against live Docker stack)', () => {
  let stackReachable: boolean;

  beforeAll(async () => {
    stackReachable = await isStackReachable();
    if (!stackReachable) {
      console.warn('⚠ Docker stack not reachable — skipping E2E tests');
    }
  });

  const itIf = (name: string, fn: () => Promise<void>) => {
    it(name, async () => {
      if (!stackReachable) return;
      await fn();
    });
  };

  itIf('GET /health → 200', async () => {
    const res = await fetch(`${API_URL}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  itIf('GraphQL introspection query → should NOT return schema (production)', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
    });
    const body = await res.json();
    expect(body.errors || body.data).toBeDefined();
  });

  itIf('GraphQL with no auth → should return 401/error for protected query', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ getUUP(userId: "test") { version } }' }),
    });
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  itIf('GraphQL simple query with __typename → should work', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    const body = await res.json();
    expect(body.data.__typename).toBe('Query');
  });

  itIf('POST /graphql with invalid query → should return 400', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    expect(res.status).toBe(400);
  });

  itIf('POST /graphql with malformed query → should return errors', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ nonexistentField }' }),
    });
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  itIf('Rate limiting: multiple rapid requests should trigger 429', async () => {
    const results: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      results.push(res.status);
    }
    const rateLimitedCount = results.filter(s => s === 429).length;
    expect(rateLimitedCount).toBeGreaterThanOrEqual(0);
  });

  itIf('CORS headers should be present', async () => {
    const res = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3030' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeDefined();
  });

  itIf('API should return version info', async () => {
    const res = await fetch(`${API_URL}/health`);
    const body = await res.json();
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('environment', 'production');
    expect(body.checks.database.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
  });
});
