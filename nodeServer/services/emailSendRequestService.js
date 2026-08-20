/**
 * Service for creating and reviewing email send requests (email_send_requests
 * rows).
 *
 * Resolves the recipient list from filter criteria once, at request time, and
 * stores that snapshot alongside the subject/HTML body for a later
 * Executive-approval step to act on. Recipients are never returned to the
 * requester — only a count.
 */

import { buildUserEmailFilterQuery } from './userFilterQueryBuilder.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a JSON string; return an empty object when parsing fails.
 *
 * @param {string|object} value
 * @returns {object}
 */
function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return value || {};
  }
  try {
    return JSON.parse(value);
  } catch {
    console.error('Error parsing JSON value:', value);
    return {};
  }
}

/**
 * Fetch and lock an email_send_requests row, validating that it exists and
 * has an acceptable status.
 *
 * @param {object}   connection      - A mysql2 connection inside a transaction.
 * @param {number}   id              - email_send_requests.id
 * @param {string[]} allowedStatuses - e.g. ['pending']
 * @returns {Promise<object>} The locked row.
 */
async function fetchAndLockEmailSendRequest(connection, id, allowedStatuses) {
  const [rows] = await connection.query(
    'SELECT * FROM email_send_requests WHERE id = ? FOR UPDATE',
    [id],
  );

  if (!rows[0]) {
    throw new Error('Email send request not found');
  }

  const emailSendRequest = rows[0];
  const normalizedStatus = String(emailSendRequest.status || '').trim().toLowerCase();

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(
      `Email send request status is "${emailSendRequest.status}", expected one of: ${allowedStatuses.join(', ')}`,
    );
  }

  return emailSendRequest;
}

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

/**
 * Reject a pending email send request. No email is sent.
 *
 * @param {object}      pool     - mysql2 connection pool.
 * @param {object}      params
 * @param {number}      params.id       - email_send_requests.id
 * @param {string}      params.approver - Reviewer username.
 * @param {string|null} params.comments - Optional review comments.
 * @throws {Error} when the row does not exist or is not currently 'pending'.
 */
export async function rejectEmailSendRequest(pool, { id, approver, comments }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await fetchAndLockEmailSendRequest(connection, id, ['pending']);

    await connection.query(
      'UPDATE email_send_requests SET status = ?, approved_by = ?, approved_at = NOW(), notes = ? WHERE id = ?',
      ['rejected', approver, comments, id],
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Failed to rollback:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Approve a pending email send request. This only performs the DB transition
 * (status -> 'approved') and returns the stored request payload — it does
 * NOT call Brevo or send anything. Callers are expected to kick off the
 * actual send (e.g. via services/brevoService.js) after this resolves, and
 * later call markEmailSendRequestSent() once that finishes.
 *
 * @param {object}      pool     - mysql2 connection pool.
 * @param {object}      params
 * @param {number}      params.id       - email_send_requests.id
 * @param {string}      params.approver - Reviewer username.
 * @param {string|null} params.comments - Optional review comments.
 * @returns {Promise<{subject: string, htmlBody: string, recipients: string[], recipientCount: number, filterCriteria: object}>}
 * @throws {Error} when the row does not exist or is not currently 'pending'.
 */
export async function approveEmailSendRequest(pool, { id, approver, comments }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const emailSendRequest = await fetchAndLockEmailSendRequest(connection, id, ['pending']);

    await connection.query(
      'UPDATE email_send_requests SET status = ?, approved_by = ?, approved_at = NOW(), notes = ? WHERE id = ?',
      ['approved', approver, comments, id],
    );

    await connection.commit();

    return safeJsonParse(emailSendRequest.data);
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Failed to rollback:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Record the outcome of a completed send: marks the request 'sent' and
 * summarizes any per-recipient failures in `notes`. Called after the
 * background send loop finishes — not part of the approve request/response
 * cycle.
 *
 * @param {object} pool - mysql2 connection pool.
 * @param {object} params
 * @param {number} params.id        - email_send_requests.id
 * @param {string[]} params.succeeded
 * @param {Array<{email: string, error: string}>} params.failed
 */
export async function markEmailSendRequestSent(pool, { id, succeeded, failed }) {
  const notes = (failed && failed.length > 0)
    ? `${failed.length} of ${succeeded.length + failed.length} failed to send: ${failed.map(f => f.email).join(', ')}`
    : null;

  await pool.query(
    'UPDATE email_send_requests SET status = ?, sent_at = NOW(), notes = ? WHERE id = ?',
    ['sent', notes, id],
  );
}
