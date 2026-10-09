import { describe, it, expect, vi } from 'vitest';
import { requestPrivacyRemoval, filterSendableRecipients } from '../services/privacyRemovalService.js';

describe('requestPrivacyRemoval', () => {
  it('flags the address and reports a new request', async () => {
    const requestedAt = new Date('2026-10-09T12:00:00Z');
    const executeQuery = vi.fn()
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ removalRequestedAt: requestedAt }]);

    const result = await requestPrivacyRemoval(executeQuery, ' pat@example.org ');

    expect(result).toEqual({ newlyRequested: true, removalRequestedAt: requestedAt });
    const [updateSql, updateParameters] = executeQuery.mock.calls[0];
    expect(updateSql).toBe('UPDATE users SET removalRequestedAt = NOW() WHERE email = ? AND removalRequestedAt IS NULL');
    expect(updateParameters).toEqual(['pat@example.org']);
  });

  it('is idempotent: a repeat request keeps the original timestamp', async () => {
    const originalRequestedAt = new Date('2026-10-01T09:00:00Z');
    const executeQuery = vi.fn()
      .mockResolvedValueOnce({ affectedRows: 0 })
      .mockResolvedValueOnce([{ removalRequestedAt: originalRequestedAt }]);

    const result = await requestPrivacyRemoval(executeQuery, 'pat@example.org');

    expect(result).toEqual({ newlyRequested: false, removalRequestedAt: originalRequestedAt });
  });

  it('throws USER_NOT_FOUND when the session email has no users row', async () => {
    const executeQuery = vi.fn()
      .mockResolvedValueOnce({ affectedRows: 0 })
      .mockResolvedValueOnce([]);

    await expect(requestPrivacyRemoval(executeQuery, 'gone@example.org')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('throws USER_NOT_FOUND without querying when there is no email', async () => {
    const executeQuery = vi.fn();

    await expect(requestPrivacyRemoval(executeQuery, undefined)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect(executeQuery).not.toHaveBeenCalled();
  });
});

describe('filterSendableRecipients', () => {
  it('keeps only addresses still in users without a removal request', async () => {
    const executeQuery = vi.fn().mockResolvedValue([{ email: 'keep@example.org' }, { email: 'Also@Example.org' }]);

    const result = await filterSendableRecipients(executeQuery, [
      'keep@example.org', 'flagged@example.org', 'also@example.org', 'deleted@example.org', 'keep@example.org',
    ]);

    expect(result).toEqual({
      sendable: ['keep@example.org', 'also@example.org'],
      excluded: ['flagged@example.org', 'deleted@example.org'],
    });
    const [sql, parameters] = executeQuery.mock.calls[0];
    expect(sql).toBe('SELECT email FROM users WHERE email IN (?) AND removalRequestedAt IS NULL');
    expect(parameters).toEqual([['keep@example.org', 'flagged@example.org', 'also@example.org', 'deleted@example.org']]);
  });

  it('returns empty lists without querying for no recipients', async () => {
    const executeQuery = vi.fn();

    expect(await filterSendableRecipients(executeQuery, [])).toEqual({ sendable: [], excluded: [] });
    expect(executeQuery).not.toHaveBeenCalled();
  });
});
