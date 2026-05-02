import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listContactsHandler, addContactHandler, editContactHandler, deleteContactHandler, renderContactsPageHandler } from '../routes/contacts.js';

// Mock the DB helper module
vi.mock('../ConnectionPool.js', () => ({
  makeDbCallAsPromise: vi.fn(),
}));
import { makeDbCallAsPromise } from '../ConnectionPool.js';

function createMockResponse() {
  const res = {
    statusCode: null,
    body: null,
    rendered: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
  };
  return res;
}

describe('contacts handlers (unit)', () => {
  beforeEach(() => {
    makeDbCallAsPromise.mockReset();
  });

  it('renders the contacts page', () => {
    const req = { session: { user: 'alice' } };
    const res = createMockResponse();
    renderContactsPageHandler(req, res);
    expect(res.rendered).toBeDefined();
    expect(res.rendered.view).toBe('contacts');
    expect(res.rendered.locals.user).toBe('alice');
  });

  it('lists contacts', async () => {
    const fakeRows = [{ id: 1, fullName: 'Bob' }];
    makeDbCallAsPromise.mockResolvedValue(fakeRows);

    const req = {};
    const res = createMockResponse();
    await listContactsHandler(req, res);
    expect(res.body).toEqual(fakeRows);
    expect(makeDbCallAsPromise).toHaveBeenCalled();
  });

  it('returns 400 when adding contact without fullName', async () => {
    const req = { body: { email: 'a@b.com' }, session: { user: 'alice' } };
    const res = createMockResponse();
    await addContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'fullName is required' });
  });

  it('adds a contact and returns insert id', async () => {
    const req = { body: { fullName: 'Charlie', email: 'c@d.com' }, session: { user: 'alice' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ insertId: 42 });

    await addContactHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, id: 42 });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
  });

  it('returns 400 for invalid edit id', async () => {
    const req = { params: { id: 'abc' }, body: {} };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid id' });
  });

  it('returns 400 for edit with no updatable fields', async () => {
    const req = { params: { id: '1' }, body: {} };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No updatable fields provided' });
  });

  it('edits a contact successfully', async () => {
    const req = { params: { id: '1' }, body: { fullName: 'New Name' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await editContactHandler(req, res);
    expect(res.body).toEqual({ success: true });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith(expect.stringContaining('UPDATE contacts SET'), expect.any(Array));
  });

  it('returns 400 for delete with invalid id', async () => {
    const req = { params: { id: '0' } };
    const res = createMockResponse();
    await deleteContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid id' });
  });

  it('deletes a contact successfully', async () => {
    const req = { params: { id: '2' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await deleteContactHandler(req, res);
    expect(res.body).toEqual({ success: true });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith('DELETE FROM contacts WHERE id = ?', [2]);
  });
});

