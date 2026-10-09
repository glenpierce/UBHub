/**
 * Service for public mailing-list signups.
 *
 * A signup is stored as a Contact: a users row with privileges = 0 and no
 * password (see /dataManagement/contact for the staff-facing equivalent), so
 * signups show up in the existing users table and are reachable by the
 * email-list filters used for bulk sends.
 *
 * Existing rows are never modified by an anonymous signup: if the email is
 * already in users (as a Contact or a full User), the signup is a no-op.
 */

import { isValidEmailAddress, validateRegionCodes } from '../utils/validationUtils.js';

export const MAILING_LIST_SIGNUP_CREATED_BY = 'mailingListSignup';

const MAXIMUM_FIELD_LENGTH = 255;

/**
 * Throw a typed 'INVALID_SIGNUP' error.
 *
 * @param {string} message
 */
function throwInvalidSignup(message) {
  const error = new Error(message);
  error.code = 'INVALID_SIGNUP';
  throw error;
}

/**
 * Trim an optional free-text form value and enforce the column length.
 *
 * @param {*} value
 * @param {string} fieldLabel - Used in the validation error message.
 * @returns {string}
 */
function normalizeOptionalText(value, fieldLabel) {
  const trimmedValue = value === undefined || value === null ? '' : String(value).trim();
  if (trimmedValue.length > MAXIMUM_FIELD_LENGTH) {
    throwInvalidSignup(`${fieldLabel} must be ${MAXIMUM_FIELD_LENGTH} characters or fewer`);
  }
  return trimmedValue;
}

/**
 * Validate and normalize the raw signup form fields.
 *
 * @param {object} formFields - Raw request body.
 * @returns {{email: string, alias: string, title: string, institution: string, region: string}}
 * @throws {Error} with code 'INVALID_SIGNUP' when a field is missing or invalid,
 *   including when privacyConsent is not 'yes'.
 */
export function normalizeSignupFormFields(formFields) {
  const fields = formFields || {};

  const email = normalizeOptionalText(fields.email, 'Email').toLowerCase();
  if (!email) {
    throwInvalidSignup('Email is required');
  }
  if (!isValidEmailAddress(email)) {
    throwInvalidSignup('Please enter a valid email address');
  }

  const alias = normalizeOptionalText(fields.alias, 'Name');
  if (!alias) {
    throwInvalidSignup('Name is required');
  }

  // GDPR: consent must be an explicit opt-in (the form's checkbox is unticked by default).
  if (fields.privacyConsent !== 'yes') {
    throwInvalidSignup('Please confirm that you agree to the privacy notice');
  }

  const regionValidation = validateRegionCodes(fields.region);
  if (!regionValidation.ok) {
    throwInvalidSignup(`Invalid region: ${regionValidation.invalid}`);
  }

  return {
    email,
    alias,
    title: normalizeOptionalText(fields.title, 'Title'),
    institution: normalizeOptionalText(fields.institution, 'Institution'),
    region: regionValidation.value,
  };
}

/**
 * Sign a person up for the mailing list.
 *
 * @param {function(string, Array): Promise<*>} executeQuery - e.g. makeDbCallAsPromise.
 * @param {object} formFields - Raw request body.
 * @returns {Promise<{created: boolean, signup: object}>} `created` is false
 *   when the email already exists in users (nothing is written).
 * @throws {Error} with code 'INVALID_SIGNUP' for invalid input.
 */
export async function createMailingListSignup(executeQuery, formFields) {
  const signup = normalizeSignupFormFields(formFields);

  const insertSql = 'INSERT IGNORE INTO users (email, alias, title, institution, region, createdBy, privileges, consentGivenAt) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())';
  const insertResult = await executeQuery(insertSql, [
    signup.email,
    signup.alias,
    signup.title,
    signup.institution,
    signup.region,
    MAILING_LIST_SIGNUP_CREATED_BY,
  ]);

  const created = Boolean(insertResult && insertResult.affectedRows > 0);
  return { created, signup };
}
