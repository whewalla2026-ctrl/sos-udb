const GQL_URL = 'http://localhost:4000/graphql';

async function gql(query: string, variables?: any) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

describe('GraphQL Contract Tests', () => {
  it('should execute __typename query on root Query', async () => {
    const body = await gql('{ __typename }');
    expect(body.data.__typename).toBe('Query');
  });

  it('should return errors for unknown query field', async () => {
    const body = await gql('{ nonexistentField }');
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toBeDefined();
  });

  it('should return structured error for invalid input', async () => {
    const body = await gql('mutation { updateUUP(userId: "", data: {}) { version } }');
    expect(body.errors).toBeDefined();
  });

  it('should not leak stack traces in query errors', async () => {
    const body = await gql('{ getUUP(userId: "nonexistent") { version } }');
    if (body.errors) {
      for (const err of body.errors) {
        expect(err.extensions?.stacktrace).toBeUndefined();
      }
    }
  });

  it('should return 400 for malformed JSON body', async () => {
    const res = await fetch(GQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json-at-all',
    });
    expect(res.status).toBe(400);
  });

  it('should NOT expose full schema via introspection (production safety)', async () => {
    const body = await gql('{ __schema { types { name } } }');
    if (body.data?.__schema) {
      expect(body.data.__schema.types.length).toBeLessThan(100);
    } else {
      expect(body.errors).toBeDefined();
    }
  });

  it('should require authentication for protected mutations', async () => {
    const body = await gql('mutation { createEscrowHold(ventureId: "v1", amount: 10) { id } }');
    expect(body.errors).toBeDefined();
  });
});
