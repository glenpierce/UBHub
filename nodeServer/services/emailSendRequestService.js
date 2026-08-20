/**
 * Service for creating email send requests (email_send_requests rows).
 *
 * Resolves the recipient list from filter criteria once, at request time, and
 * stores that snapshot alongside the subject/HTML body for a later
 * Executive-approval step to act on. Recipients are never returned to the
 * caller — only a count.
 */

import { buildUserEmailFilterQuery } from './userFilterQueryBuilder.js';

/**
 * Throw a typed 'INVALID_EMAIL_REQUEST' error.
 *
 * @param {string} message
 */
function throwInvalidEmailRequest(message) {
  const error = new Error(message);
  error.code = 'INVALID_EMAIL_REQUEST';
  throw error;
}

/**
 * Create a new email send request: resolve recipients from filterCriteria,
 * validate subject/htmlBody, and insert a pending row into
 * email_send_requests.
 *
 * @param {object} pool          - mysql2 connection pool.
 * @param {object} params
 * @param {string} params.requestedBy    - Username of the requester.
 * @param {string} params.subject        - Email subject line.
 * @param {string} params.htmlBody       - Raw HTML email content.
 * @param {object} params.filterCriteria - Map of filterFieldName → raw filter value
 *   (see getUserEmailFilterFieldDefinitions() in services/tableMetadata.js).
 * @returns {Promise<{id: number, recipientCount: number}>}
 * @throws {Error} with code 'INVALID_EMAIL_REQUEST' when subject/htmlBody are
 *   missing or no recipients match the filter.
 * @throws {Error} with code 'INVALID_FILTER_CRITERIA' / 'INVALID_FILTER_FIELD'
 *   propagated from buildUserEmailFilterQuery().
 */
export async function createEmailSendRequest(pool, { requestedBy, subject, htmlBody, filterCriteria }) {
  const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
  const trimmedHtmlBody = typeof htmlBody === 'string' ? htmlBody.trim() : '';

  if (!trimmedSubject) {
    throwInvalidEmailRequest('subject is required');
  }
  if (!trimmedHtmlBody) {
    throwInvalidEmailRequest('htmlBody is required');
  }

  const { sql, parameters } = buildUserEmailFilterQuery(filterCriteria);

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(sql, parameters);
    const emails = (rows || []).map(row => String(row.email || '').trim()).filter(Boolean);
    const recipients = Array.from(new Set(emails));

    if (recipients.length === 0) {
      throwInvalidEmailRequest('No recipients match the provided filters');
    }

    const dataJson = JSON.stringify({
      subject: trimmedSubject,
      htmlBody: trimmedHtmlBody,
      recipients,
      recipientCount: recipients.length,
      filterCriteria: filterCriteria || {},
    });

    const [insertResult] = await connection.query(
      'INSERT INTO email_send_requests (requested_by, data) VALUES (?, ?)',
      [requestedBy, dataJson],
    );

    return { id: insertResult.insertId, recipientCount: recipients.length };
  } finally {
    connection.release();
  }
}
