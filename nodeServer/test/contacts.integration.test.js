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

describe('contacts handlers (integration)', () => {
  beforeAll(async () => {
    // Ensure the contacts table exists in the test database
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
    // Clean up table contents
    await makeDbCallAsPromise('DELETE FROM contacts');
  });

  it('can add and list a contact using the real database', async () => {
    const reqAdd = { body: { fullName: 'Integration User', email: 'int@example.com' }, session: { user: 'tester' } };
    const resAdd = createMockResponse();

    await addContactHandler(reqAdd, resAdd);
    expect(resAdd.statusCode).toBe(201);
    expect(resAdd.body && resAdd.body.success).toBe(true);
    const insertedId = resAdd.body.id;
    expect(insertedId).toBeDefined();

    const reqList = {};
    const resList = createMockResponse();
    await listContactsHandler(reqList, resList);
    expect(Array.isArray(resList.body)).toBe(true);
    const found = resList.body.find(r => r.email === 'int@example.com');
    expect(found).toBeDefined();

    // cleanup the inserted contact
    const reqDel = { params: { id: String(insertedId) } };
    const resDel = createMockResponse();
    await deleteContactHandler(reqDel, resDel);
    expect(resDel.body && resDel.body.success).toBe(true);
  }, 30000);
});

