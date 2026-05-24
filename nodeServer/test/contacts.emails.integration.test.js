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

describe('contacts emails endpoint (integration)', () => {
  beforeAll(async () => {
    const createSql = `CREATE TABLE IF NOT EXISTS contacts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(1024) CHARACTER SET utf8 NOT NULL,
      email VARCHAR(255) CHARACTER SET utf8 NOT NULL,
      phone VARCHAR(64) CHARACTER SET utf8,
      title VARCHAR(512) CHARACTER SET utf8,
      organization VARCHAR(512) CHARACTER SET utf8,
      region VARCHAR(255) CHARACTER SET utf8,
      level VARCHAR(255) CHARACTER SET utf8,
      workingGroup VARCHAR(255) CHARACTER SET utf8,
      createdBy VARCHAR(255) CHARACTER SET utf8,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    await makeDbCallAsPromise(createSql);
  }, 30000);

  afterAll(async () => {
    await makeDbCallAsPromise('DELETE FROM contacts');
  });

  it('returns emails for single and multiple regions', async () => {
    // insert some contacts
    const req1 = { body: { fullName: 'A', email: 'a@example.com', region: 'EU,NA' }, session: { user: 'tester' } };
    const res1 = createMockResponse();
    await addContactHandler(req1, res1);
    expect(res1.statusCode).toBe(201);

    const req2 = { body: { fullName: 'B', email: 'b@example.com', region: 'NA' }, session: { user: 'tester' } };
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

