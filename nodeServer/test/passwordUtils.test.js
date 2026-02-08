import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { generatePasswordHash, comparePassword } from '../services/passwordUtils.js';

describe('passwordUtils', () => {
  it('generatePasswordHash creates a bcrypt hash that compares successfully', () => {
    const email = 'user@example.com';
    const password = 'S3cureP@ssw0rd!';

    const hash = generatePasswordHash(password, email);
    expect(typeof hash).toBe('string');

    const match = bcrypt.compareSync(password, hash);
    expect(match).toBe(true);
  });

  it('hashes differ for different emails', () => {
    const password = 'SamePassword';
    const hashA = generatePasswordHash(password, 'a@example.com');
    const hashB = generatePasswordHash(password, 'b@example.com');
    expect(hashA).not.toBe(hashB);
  });

  it('comparePassword resolves true for correct password and false for incorrect', async () => {
    const email = 'tester@example.com';
    const password = 'MyPassword123';
    const wrongPassword = 'NotMyPassword';

    const hash = generatePasswordHash(password, email);

    await expect(comparePassword(password, hash)).resolves.toBe(true);
    await expect(comparePassword(wrongPassword, hash)).resolves.toBe(false);
  });
});

