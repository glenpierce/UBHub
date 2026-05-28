import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { addContactHandler, listContactsHandler, deleteContactHandler } from '../routes/contacts.js';
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

const TEST_EMAIL = 'int@example.com';

describe('contacts handlers (integration)', () => {
  beforeAll(async () => {
    // Ensure the users table has the columns required for contacts and clean up any leftover test rows.
    // The full schema is managed via databaseTools.sql; here we only guarantee test isolation.
    await makeDbCallAsPromise('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
  }, 30000);

  afterAll(async () => {
    // Clean up any rows created during this test suite.
    await makeDbCallAsPromise('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
  });

  it('can add and list a contact using the real database', async () => {
    const reqAdd = { body: { alias: 'Integration User', email: TEST_EMAIL }, session: { user: 'tester' } };
    const resAdd = createMockResponse();

    await addContactHandler(reqAdd, resAdd);
    expect(resAdd.statusCode).toBe(201);
    expect(resAdd.body && resAdd.body.success).toBe(true);
    expect(resAdd.body.email).toBe(TEST_EMAIL);

    const reqList = {};
    const resList = createMockResponse();
    await listContactsHandler(reqList, resList);
    expect(Array.isArray(resList.body)).toBe(true);
    const found = resList.body.find(r => r.email === TEST_EMAIL);
    expect(found).toBeDefined();
    expect(found.privileges).toBe(0);

    // cleanup the inserted contact
    const reqDel = { params: { email: TEST_EMAIL } };
    const resDel = createMockResponse();
    await deleteContactHandler(reqDel, resDel);
    expect(resDel.body && resDel.body.success).toBe(true);
  }, 30000);
});
