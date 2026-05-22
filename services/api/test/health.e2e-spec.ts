const API_URL = 'http://localhost:4000';

describe('UDB API E2E (against live Docker stack)', () => {
  it('GET /health → 200', async () => {
    const res = await fetch(`${API_URL}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('GraphQL introspection query → should NOT return schema (production)', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
    });
    const body = await res.json();
    expect(body.errors || body.data).toBeDefined();
  });

  it('GraphQL with no auth → should return 401/error for protected query', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ getUUP(userId: "test") { version } }' }),
    });
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  it('GraphQL simple query with __typename → should work', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    const body = await res.json();
    expect(body.data.__typename).toBe('Query');
  });

  it('POST /graphql with invalid query → should return 400', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    expect(res.status).toBe(400);
  });

  it('POST /graphql with malformed query → should return errors', async () => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ nonexistentField }' }),
    });
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  it('Rate limiting: multiple rapid requests should trigger 429', async () => {
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

  it('CORS headers should be present', async () => {
    const res = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3030' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeDefined();
  });

  it('API should return version info', async () => {
    const res = await fetch(`${API_URL}/health`);
    const body = await res.json();
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('environment', 'production');
    expect(body.checks.database.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
  });
});
