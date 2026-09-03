import { describe, it, expect } from 'vitest';
import {
  coerceToInteger,
  isNonEmptyString,
  isValidEmailAddress,
  isValidOperation,
  isValidReviewDecision,
  normalizeComments,
} from '../utils/validationUtils.js';

describe('validationUtils', () => {
  describe('coerceToInteger', () => {
    it('returns null for null', () => {
      expect(coerceToInteger(null)).toBe(null);
    });

    it('returns null for undefined', () => {
      expect(coerceToInteger(undefined)).toBe(null);
    });

    it('returns null for empty string', () => {
      expect(coerceToInteger('')).toBe(null);
    });

    it('returns null for whitespace-only string', () => {
      expect(coerceToInteger('   ')).toBe(null);
    });

    it('returns null for non-numeric string', () => {
      expect(coerceToInteger('abc')).toBe(null);
    });

    it('returns null for float string', () => {
      expect(coerceToInteger('1.5')).toBe(null);
    });

    it('returns null for float number', () => {
      expect(coerceToInteger(1.23)).toBe(null);
    });

    it('returns null for NaN', () => {
      expect(coerceToInteger(NaN)).toBe(null);
    });

    it('returns null for boolean', () => {
      expect(coerceToInteger(true)).toBe(null);
    });

    it('returns null for object', () => {
      expect(coerceToInteger({})).toBe(null);
    });

    it('returns integer for valid integer string', () => {
      expect(coerceToInteger('42')).toBe(42);
    });

    it('returns integer for valid integer string with whitespace', () => {
      expect(coerceToInteger('  7  ')).toBe(7);
    });

    it('returns integer for valid integer number', () => {
      expect(coerceToInteger(123)).toBe(123);
    });

    it('returns zero for string "0"', () => {
      expect(coerceToInteger('0')).toBe(0);
    });

    it('returns zero for number 0', () => {
      expect(coerceToInteger(0)).toBe(0);
    });

    it('handles negative integers', () => {
      expect(coerceToInteger(-5)).toBe(-5);
      expect(coerceToInteger('-5')).toBe(-5);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns false for null', () => {
      expect(isNonEmptyString(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isNonEmptyString(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isNonEmptyString(123)).toBe(false);
    });

    it('returns true for a non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });
  });

  describe('isValidOperation', () => {
    it('returns true for insert', () => {
      expect(isValidOperation('insert')).toBe(true);
    });

    it('returns true for update', () => {
      expect(isValidOperation('update')).toBe(true);
    });

    it('returns true for delete', () => {
      expect(isValidOperation('delete')).toBe(true);
    });

    it('returns false for unknown operation', () => {
      expect(isValidOperation('upsert')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidOperation(null)).toBe(false);
    });

    it('returns false for number', () => {
      expect(isValidOperation(1)).toBe(false);
    });
  });

  describe('isValidReviewDecision', () => {
    it('returns true for approve (lowercase)', () => {
      expect(isValidReviewDecision('approve')).toBe(true);
    });

    it('returns true for reject (lowercase)', () => {
      expect(isValidReviewDecision('reject')).toBe(true);
    });

    it('returns true for Approve (mixed case)', () => {
      expect(isValidReviewDecision('Approve')).toBe(true);
    });

    it('returns false for unknown decision', () => {
      expect(isValidReviewDecision('maybe')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidReviewDecision(null)).toBe(false);
    });
  });

  describe('isValidEmailAddress', () => {
    it('returns true for a plausible email address', () => {
      expect(isValidEmailAddress('user@example.com')).toBe(true);
    });

    it('returns true for an address with a subdomain and plus-addressing', () => {
      expect(isValidEmailAddress('user+tag@mail.example.co')).toBe(true);
    });

    it('returns false for a bare placeholder value with no @ or domain', () => {
      expect(isValidEmailAddress('contact01')).toBe(false);
    });

    it('returns false for a value missing the domain TLD', () => {
      expect(isValidEmailAddress('user@localhost')).toBe(false);
    });

    it('returns false for a value with spaces', () => {
      expect(isValidEmailAddress('user name@example.com')).toBe(false);
    });

    it('returns false for empty string, null, undefined, and non-strings', () => {
      expect(isValidEmailAddress('')).toBe(false);
      expect(isValidEmailAddress(null)).toBe(false);
      expect(isValidEmailAddress(undefined)).toBe(false);
      expect(isValidEmailAddress(42)).toBe(false);
    });
  });

  describe('normalizeComments', () => {
    it('returns null for null', () => {
      expect(normalizeComments(null)).toBe(null);
    });

    it('returns null for undefined', () => {
      expect(normalizeComments(undefined)).toBe(null);
    });

    it('returns string for string input', () => {
      expect(normalizeComments('good work')).toBe('good work');
    });

    it('coerces number to string', () => {
      expect(normalizeComments(42)).toBe('42');
    });

    it('coerces empty string to string', () => {
      expect(normalizeComments('')).toBe('');
    });
  });
});

