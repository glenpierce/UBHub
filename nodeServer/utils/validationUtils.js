/**
 * Centralized validation utilities for the data management domain.
 *
 * Pure functions for input validation – no side effects, no DB access.
 * DB-dependent validation (e.g. location existence) lives in the service layer.
 */

/**
 * Coerce a value to a strict integer or return null.
 *
 * Handles strings, numbers, and edge cases (empty string, NaN, floats).
 *
 * @param {*} value - The value to coerce.
 * @returns {number|null} The integer value, or null if coercion fails.
 */
export function coerceToInteger(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      return null;
    }
    return parsed;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isInteger(value)) {
      return null;
    }
    return value;
  }

  return null;
}

/**
 * Return true when value is a non-empty string (after trimming).
 *
 * @param {*} value - The value to check.
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that the operation is one of the allowed CRUD operations.
 *
 * @param {string} operation - The operation string to validate.
 * @returns {boolean} true if the operation is valid.
 */
export function isValidOperation(operation) {
  return typeof operation === 'string' && ['insert', 'update', 'delete'].includes(operation);
}

/**
 * Validate that the decision string is one of the allowed review decisions.
 *
 * @param {string} decision - The decision string to validate.
 * @returns {boolean} true if the decision is valid.
 */
export function isValidReviewDecision(decision) {
  return typeof decision === 'string' && ['approve', 'reject'].includes(decision.toLowerCase());
}

// Pragmatic email format check (not full RFC 5322): local part, '@', domain
// with at least one '.'. Good enough to reject placeholder/test values like
// "contact01" before they're treated as a real send address.
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Return true when value looks like a plausible email address.
 *
 * @param {*} value - The value to check.
 * @returns {boolean}
 */
export function isValidEmailAddress(value) {
  return typeof value === 'string' && EMAIL_FORMAT_PATTERN.test(value.trim());
}

/**
 * Normalize a comments value.
 *
 * If comments is null or undefined, return null.
 * Otherwise coerce to a string.
 *
 * @param {*} comments - The comments value.
 * @returns {string|null}
 */
export function normalizeComments(comments) {
  if (comments === undefined || comments === null) {
    return null;
  }
  return String(comments);
}

