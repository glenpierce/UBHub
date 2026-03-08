import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dm from '../routes/dataManagement.js';
import * as conn from '../ConnectionPool.js';

describe('validateLocationExists', () => {
  let makeDbCallMock;

  beforeEach(() => {
    makeDbCallMock = vi.spyOn(conn, 'makeDbCallAsPromise');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for null/undefined/invalid ids', async () => {
    await expect(dm.validateLocationExists(null)).resolves.toBe(false);
    await expect(dm.validateLocationExists(undefined)).resolves.toBe(false);
    await expect(dm.validateLocationExists('')).resolves.toBe(false);
    await expect(dm.validateLocationExists('abc')).resolves.toBe(false);
    await expect(dm.validateLocationExists(1.23)).resolves.toBe(false);
  });

  it('returns false when DB returns empty', async () => {
    makeDbCallMock.mockResolvedValue([]);
    await expect(dm.validateLocationExists(123)).resolves.toBe(false);
    expect(makeDbCallMock).toHaveBeenCalledWith('SELECT 1 FROM `locations` WHERE id = ? LIMIT 1', [123]);
  });

  it('returns true when DB returns a row', async () => {
    makeDbCallMock.mockResolvedValue([{ '1': 1 }]);
    await expect(dm.validateLocationExists(5)).resolves.toBe(true);
    expect(makeDbCallMock).toHaveBeenCalledWith('SELECT 1 FROM `locations` WHERE id = ? LIMIT 1', [5]);
  });
});

