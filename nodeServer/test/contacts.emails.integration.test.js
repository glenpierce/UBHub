import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { addContactHandler, getEmailsHandler } from '../routes/contacts.js';
import { makeDbCallAsPromise } from '../ConnectionPool.js';

function createMockResponse() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

const TEST_EMAILS = ['a@example.com', 'b@example.com'];

describe('contacts emails endpoint (integration)', () => {
  beforeAll(async () => {
    // Clean up any leftover rows from a previous run to ensure test isolation.
    for (const testEmail of TEST_EMAILS) {
      await makeDbCallAsPromise('DELETE FROM users WHERE email = ?', [testEmail]);
    }
  }, 30000);

  afterAll(async () => {
    for (const testEmail of TEST_EMAILS) {
      await makeDbCallAsPromise('DELETE FROM users WHERE email = ?', [testEmail]);
    }
  });

  it('returns emails for single and multiple regions', async () => {
    // insert some contacts via the handler (they land in users with privileges = 0)
    const req1 = { body: { alias: 'A', email: 'a@example.com', region: 'EU,NA' }, session: { user: 'tester' } };
    const res1 = createMockResponse();
    await addContactHandler(req1, res1);
    expect(res1.statusCode).toBe(201);

    const req2 = { body: { alias: 'B', email: 'b@example.com', region: 'NA' }, session: { user: 'tester' } };
    const res2 = createMockResponse();
    await addContactHandler(req2, res2);
    expect(res2.statusCode).toBe(201);

    const reqApi = { query: { regions: 'EU' } };
    const resApi = createMockResponse();
    await getEmailsHandler(reqApi, resApi);
    expect(resApi.statusCode).toBeNull();
    expect(Array.isArray(resApi.body.emails)).toBe(true);
    expect(resApi.body.emails).toContain('a@example.com');

    const reqApi2 = { query: { regions: 'NA' } };
    const resApi2 = createMockResponse();
    await getEmailsHandler(reqApi2, resApi2);
    expect(resApi2.body.emails).toEqual(expect.arrayContaining(['a@example.com','b@example.com']));
  }, 30000);

  it('returns 400 for invalid region in query', async () => {
    const reqApi = { query: { regions: 'FOO' } };
    const resApi = createMockResponse();
    await getEmailsHandler(reqApi, resApi);
    expect(resApi.statusCode).toBe(400);
    expect(resApi.body).toEqual({ error: 'Invalid region code: FOO' });
  });
});
