import { describe, it, expect, vi } from 'vitest';
import {
  createMailingListSignup,
  normalizeSignupFormFields,
  MAILING_LIST_SIGNUP_CREATED_BY,
} from '../services/mailingListSignupService.js';

const validFormFields = {
  email: '  Person@Example.org ',
  alias: ' Pat Person ',
  title: 'Director',
  institution: 'City Zoo',
  region: ['EU', 'NA'],
};

describe('normalizeSignupFormFields', () => {
  it('trims and lowercases email and trims other fields', () => {
    expect(normalizeSignupFormFields(validFormFields)).toEqual({
      email: 'person@example.org',
      alias: 'Pat Person',
      title: 'Director',
      institution: 'City Zoo',
      region: 'EU,NA',
    });
  });

  it('accepts a single region posted as a string', () => {
    expect(normalizeSignupFormFields({ ...validFormFields, region: 'OC' }).region).toBe('OC');
  });

  it('allows optional fields to be omitted', () => {
    expect(normalizeSignupFormFields({ email: 'person@example.org', alias: 'Pat' })).toEqual({
      email: 'person@example.org',
      alias: 'Pat',
      title: '',
      institution: '',
      region: '',
    });
  });

  it.each([
    [{ ...validFormFields, email: '' }, 'Email is required'],
    [{ ...validFormFields, email: 'not-an-email' }, 'Please enter a valid email address'],
    [{ ...validFormFields, alias: '   ' }, 'Name is required'],
    [{ ...validFormFields, region: ['EU', 'MARS'] }, 'Invalid region: MARS'],
    [{ ...validFormFields, title: 'x'.repeat(256) }, 'Title must be 255 characters or fewer'],
  ])('rejects invalid input with INVALID_SIGNUP (%#)', (formFields, expectedMessage) => {
    expect(() => normalizeSignupFormFields(formFields)).toThrow(expectedMessage);
    try {
      normalizeSignupFormFields(formFields);
    } catch (error) {
      expect(error.code).toBe('INVALID_SIGNUP');
    }
  });

  it('rejects a missing body', () => {
    expect(() => normalizeSignupFormFields(undefined)).toThrow('Email is required');
  });
});

describe('createMailingListSignup', () => {
  it('inserts a Contact (privileges 0, no password) with parameterized values', async () => {
    const executeQuery = vi.fn().mockResolvedValue({ affectedRows: 1 });

    const result = await createMailingListSignup(executeQuery, validFormFields);

    expect(result.created).toBe(true);
    expect(result.signup.email).toBe('person@example.org');
    expect(executeQuery).toHaveBeenCalledTimes(1);
    const [sql, parameters] = executeQuery.mock.calls[0];
    expect(sql).toMatch(/^INSERT IGNORE INTO users/);
    expect(sql).toMatch(/privileges\) VALUES \(\?, \?, \?, \?, \?, \?, 0\)/);
    expect(sql).not.toMatch(/hashedPassword/);
    expect(parameters).toEqual([
      'person@example.org', 'Pat Person', 'Director', 'City Zoo', 'EU,NA', MAILING_LIST_SIGNUP_CREATED_BY,
    ]);
  });

  it('reports created=false when the email already exists', async () => {
    const executeQuery = vi.fn().mockResolvedValue({ affectedRows: 0 });

    const result = await createMailingListSignup(executeQuery, validFormFields);

    expect(result.created).toBe(false);
  });

  it('does not touch the database for invalid input', async () => {
    const executeQuery = vi.fn();

    await expect(createMailingListSignup(executeQuery, { email: 'bad' })).rejects.toMatchObject({ code: 'INVALID_SIGNUP' });
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it('propagates database errors', async () => {
    const executeQuery = vi.fn().mockRejectedValue(new Error('connection lost'));

    await expect(createMailingListSignup(executeQuery, validFormFields)).rejects.toThrow('connection lost');
  });
});
