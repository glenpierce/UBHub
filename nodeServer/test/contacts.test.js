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
    const fakeRows = [{ email: 'bob@example.com', alias: 'Bob', privileges: 0 }];
    makeDbCallAsPromise.mockResolvedValue(fakeRows);

    const req = {};
    const res = createMockResponse();
    await listContactsHandler(req, res);
    expect(res.body).toEqual(fakeRows);
    expect(makeDbCallAsPromise).toHaveBeenCalled();
  });

  it('returns 400 when adding contact without alias', async () => {
    const req = { body: { email: 'a@b.com' }, session: { user: 'alice' } };
    const res = createMockResponse();
    await addContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'alias is required' });
  });

  it('adds a contact and returns the email', async () => {
    const req = { body: { alias: 'Charlie', email: 'c@d.com' }, session: { user: 'alice' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await addContactHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, email: 'c@d.com' });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
  });

  it('returns 400 when adding contact with invalid region code', async () => {
    const req = { body: { alias: 'Dana', email: 'd@e.com', region: 'INVALID' }, session: { user: 'alice' } };
    const res = createMockResponse();
    await addContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid region code: INVALID' });
  });

  it('adds a contact with multiple region codes', async () => {
    const req = { body: { alias: 'Eve', email: 'e@f.com', region: ['EU','NA'] }, session: { user: 'alice' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await addContactHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, email: 'e@f.com' });
    // ensure DB was called
    expect(makeDbCallAsPromise).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
  });

  it('returns 400 when adding contact with invalid region array', async () => {
    const req = { body: { alias: 'Fred', email: 'f@g.com', region: ['EU','BAD'] }, session: { user: 'alice' } };
    const res = createMockResponse();
    await addContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid region code: BAD' });
  });

  it('returns 400 for edit with empty email param', async () => {
    const req = { params: { email: '' }, body: { alias: 'New Name' } };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid email' });
  });

  it('returns 400 for edit with no updatable fields', async () => {
    const req = { params: { email: 'test@example.com' }, body: {} };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No updatable fields provided' });
  });

  it('edits a contact successfully', async () => {
    const req = { params: { email: 'test@example.com' }, body: { alias: 'New Name' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await editContactHandler(req, res);
    expect(res.body).toEqual({ success: true });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET'), expect.any(Array));
  });

  it('returns 400 when editing contact with invalid region code', async () => {
    const req = { params: { email: 'test@example.com' }, body: { region: 'BAD' } };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid region code: BAD' });
  });

  it('returns 400 when editing contact with invalid region array', async () => {
    const req = { params: { email: 'test@example.com' }, body: { region: ['NA','FOO'] } };
    const res = createMockResponse();
    await editContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid region code: FOO' });
  });

  it('returns 400 for delete with empty email param', async () => {
    const req = { params: { email: '' } };
    const res = createMockResponse();
    await deleteContactHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid email' });
  });

  it('deletes a contact successfully', async () => {
    const req = { params: { email: 'del@example.com' } };
    const res = createMockResponse();
    makeDbCallAsPromise.mockResolvedValue({ affectedRows: 1 });

    await deleteContactHandler(req, res);
    expect(res.body).toEqual({ success: true });
    expect(makeDbCallAsPromise).toHaveBeenCalledWith('DELETE FROM users WHERE email = ?', ['del@example.com']);
  });
});
