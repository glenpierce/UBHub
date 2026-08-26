/**
 * Data-management routes.
 *
 * This module is a thin orchestration layer: it parses requests, delegates to
 * services, and formats HTTP responses.  Business logic, SQL generation, and
 * validation live in dedicated service and utility modules.
 */

import express from 'express';
import {pool, makeDbCallAsPromise} from '../ConnectionPool.js';
import {isAuthenticated, isContributor, isApprover, isExec} from '../middleware/authMiddleware.js';
import {
  getTablesForUser,
  getNavigationMenuForUser,
  getServerTableMetadata,
  getEditableColumnsForUser,
  getUserEmailFilterFieldDefinitions,
} from '../services/tableMetadata.js';
import {buildTableDataQuery} from '../services/queryBuilder.js';
import {buildUserEmailFilterQuery} from '../services/userFilterQueryBuilder.js';
import {createPendingChange} from '../services/pendingChangeService.js';
import {
  createEmailSendRequest,
  approveEmailSendRequest,
  rejectEmailSendRequest,
  markEmailSendRequestSent,
} from '../services/emailSendRequestService.js';
import {sendToAllRecipientsIndividually} from '../services/brevoService.js';
import config from '../config.js';
import {approveVersion, rejectVersion} from '../services/approvalService.js';
import {
  coerceToInteger,
  isNonEmptyString,
  isValidEmailAddress,
  isValidOperation,
  isValidReviewDecision,
  normalizeComments,
} from '../utils/validationUtils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Page render
// ---------------------------------------------------------------------------

router.get('/', function (request, response) {
  const dataManagementConfig = {
    tablesForUser: getTablesForUser(request),
    editableColumns: getEditableColumnsForUser(request),
    navMenu: getNavigationMenuForUser(request),
    user: request.user,
  };

  response.render('dataManagement', {
    dataManagementConfig: JSON.stringify(dataManagementConfig),
    user: request.session.user,
  });
});

// ---------------------------------------------------------------------------
// Table data (SELECT with joins)
// ---------------------------------------------------------------------------

router.get('/table-data/:tableName', isAuthenticated, isContributor, async (request, response) => {
  try {
    const tableName = request.params.tableName;

    const validTableNames = Object.keys(getTablesForUser(request));
    if (!validTableNames.includes(tableName)) {
      return response.status(400).json({error: 'Invalid table name'});
    }

    const clientMeta = getTablesForUser(request)[tableName];
    if (!clientMeta) {
      return response.status(400).json({error: 'Invalid table name'});
    }

    let serverMeta;
    try {
      serverMeta = getServerTableMetadata(tableName);
    } catch {
      return response.status(500).json({error: 'Server table metadata not found'});
    }

    const {sql} = buildTableDataQuery({tableName, serverMeta});

    if (!sql) {
      return response.json([]);
    }

    const result = await makeDbCallAsPromise(sql);
    response.json(result);
  } catch (error) {
    console.error('Error fetching table data:', error);
    response.status(500).json({error: 'Database error'});
  }
});

// ---------------------------------------------------------------------------
// Pending change creation
// ---------------------------------------------------------------------------

router.post('/pending-change', isAuthenticated, isContributor, async (request, response) => {
  try {
    const {tableName, rowKey, operation, data} = request.body;

    if (!isNonEmptyString(tableName)) {
      return response.status(400).json({error: 'tableName required'});
    }
    if (!isValidOperation(operation)) {
      return response.status(400).json({error: 'invalid operation'});
    }
    if (rowKey && typeof rowKey !== 'object') {
      return response.status(400).json({error: 'rowKey must be an object'});
    }
    if (data && typeof data !== 'object') {
      return response.status(400).json({error: 'data must be an object'});
    }

    await createPendingChange(pool, tableName, rowKey || {}, operation, data || {}, request.session.user);

    response.status(201).json({success: true});
  } catch (error) {
    if (error.code === 'INVALID_TABLE') {
      return response.status(400).json({error: 'Invalid table'});
    }
    if (error.code === 'INVALID_INST_ID') {
      return response.status(400).json({error: error.message});
    }
    console.error('Error creating pending change:', error);
    response.status(500).json({error: 'Error creating pending change' + error.message});
  }
});

// ---------------------------------------------------------------------------
// Pending change review (approve / reject)
// ---------------------------------------------------------------------------

router.post('/pending-change/review', isAuthenticated, isApprover, async (request, response) => {
  const {decision, comments} = request.body;
  const id = coerceToInteger(request.body && request.body.id);

  try {
    if (id === null) {
      return response.status(400).json({error: 'Invalid id'});
    }
    if (!isValidReviewDecision(decision)) {
      return response.status(400).json({error: 'Invalid decision'});
    }

    const reviewComments = normalizeComments(comments);
    const normalizedDecision = decision.toLowerCase();

    if (normalizedDecision === 'reject') {
      await rejectVersion(pool, id, request.session.user, reviewComments);
      return response.status(200).json({Status: 'Rejected'});
    }

    await approveVersion(pool, id, request.session.user, reviewComments);
    return response.status(200).json({Status: 'Approved'});
  } catch (error) {
    console.error('Error reviewing pending change:', error);
    response.status(500).json({error: 'Error reviewing pending change' + error.message});
  }
});

// ---------------------------------------------------------------------------
// Location helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a given inst_id exists in the locations table.
 * Exported for backward-compatible test access.
 *
 * @param {*} instId
 * @returns {Promise<boolean>}
 */
export async function validateLocationExists(instId) {
  const numericId = coerceToInteger(instId);
  if (numericId === null) {
    return false;
  }

  const rows = await makeDbCallAsPromise('SELECT 1 FROM `locations` WHERE id = ? LIMIT 1', [numericId]);

  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    return false;
  }

  return true;
}

router.get('/getLocationById/:id', isAuthenticated, isContributor, async (request, response) => {
  try {
    const numericId = coerceToInteger(request.params.id);

    if (numericId === null) {
      return response.status(400).json({error: 'Invalid id'});
    }

    const rows = await makeDbCallAsPromise('SELECT id, inst_title FROM `locations` WHERE id = ? LIMIT 1', [numericId]);

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return response.status(404).json({error: 'Location not found'});
    }

    return response.json(rows[0]);
  } catch (error) {
    console.error('Error fetching location by id:', error);
    return response.status(500).json({error: 'Database error'});
  }
});

router.get('/location-search', isAuthenticated, isContributor, async (request, response) => {
  try {
    const query = (request.query.query || '').trim();

    if (!query) {
      return response.json([]);
    }

    const sql = 'SELECT id, inst_title FROM `locations` WHERE inst_title LIKE ? LIMIT 50';
    const parameters = [`%${query}%`];
    const rows = await makeDbCallAsPromise(sql, parameters);

    response.json(rows || []);
  } catch (error) {
    console.error('Error searching locations:', error);
    response.status(500).json({error: 'Search error'});
  }
});

// ---------------------------------------------------------------------------
// Contact management (users with privileges = 0)
// These endpoints bypass the approval workflow and write directly to the users
// table.  Region codes must be from the allowed set.
// ---------------------------------------------------------------------------

const ALLOWED_REGION_CODES = new Set(['NA', 'LA', 'CAR', 'MECNA', 'AF', 'ESA', 'SA', 'EU', 'OC']);

function validateRegionCodes(regionString) {
  if (!regionString) return { ok: true, value: '' };
  const codes = String(regionString).split(',').map(code => code.trim()).filter(Boolean);
  for (const code of codes) {
    if (!ALLOWED_REGION_CODES.has(code)) return { ok: false, invalid: code };
  }
  return { ok: true, value: codes.join(',') };
}

/**
 * Create a Contact (user with privileges = 0, no password).
 * Required body fields: email, alias.
 */
router.post('/contact', isAuthenticated, isContributor, async (request, response) => {
  try {
    const normalizedEmail = request.body.email ? String(request.body.email).trim().toLowerCase() : '';
    const alias = request.body.alias ? String(request.body.alias).trim() : '';

    if (!alias) return response.status(400).json({error: 'alias is required'});
    if (!normalizedEmail) return response.status(400).json({error: 'email is required'});
    if (!isValidEmailAddress(normalizedEmail)) return response.status(400).json({error: 'email must be a valid email address'});

    const regionValidation = validateRegionCodes(request.body.region || '');
    if (!regionValidation.ok) {
      return response.status(400).json({error: `Invalid region code: ${regionValidation.invalid}`});
    }

    const insertSql = 'INSERT INTO `users` (email, alias, phone, title, institution, region, level, workingGroup, createdBy, privileges) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)';
    const parameters = [
      normalizedEmail,
      alias,
      request.body.phone ? String(request.body.phone).trim() : '',
      request.body.title ? String(request.body.title).trim() : '',
      request.body.institution ? String(request.body.institution).trim() : '',
      regionValidation.value,
      request.body.level ? String(request.body.level).trim() : '',
      request.body.workingGroup ? String(request.body.workingGroup).trim() : '',
      request.session && request.session.user ? request.session.user : null,
    ];

    await makeDbCallAsPromise(insertSql, parameters);
    return response.status(201).json({success: true, email: normalizedEmail});
  } catch (error) {
    console.error('Error creating contact:', error);
    return response.status(500).json({error: 'Database error'});
  }
});

/**
 * Update an existing contact/user's editable fields (direct, no approval workflow).
 * Body: { rowKey: { email }, data: { alias, phone, title, institution, region, level, workingGroup } }
 * Requires approver-level privileges to prevent contributors from editing user records.
 */
router.post('/contact/update', isAuthenticated, isApprover, async (request, response) => {
  try {
    const rowKey = request.body && request.body.rowKey ? request.body.rowKey : {};
    const data = request.body && request.body.data ? request.body.data : {};
    const emailKey = rowKey.email ? String(rowKey.email).trim() : '';

    if (!emailKey) return response.status(400).json({error: 'rowKey.email is required'});

    const allowedUpdateFields = ['alias', 'phone', 'title', 'institution', 'region', 'level', 'workingGroup'];
    const updatesMap = {};
    allowedUpdateFields.forEach(fieldName => {
      if (Object.prototype.hasOwnProperty.call(data, fieldName)) {
        updatesMap[fieldName] = String(data[fieldName] || '').trim();
      }
    });

    if (Object.keys(updatesMap).length === 0) {
      return response.status(400).json({error: 'No updatable fields provided'});
    }

    if (Object.prototype.hasOwnProperty.call(updatesMap, 'region')) {
      const regionValidation = validateRegionCodes(updatesMap.region);
      if (!regionValidation.ok) {
        return response.status(400).json({error: `Invalid region code: ${regionValidation.invalid}`});
      }
      updatesMap.region = regionValidation.value;
    }

    const setFragments = Object.keys(updatesMap).map(fieldName => `${fieldName} = ?`);
    const queryParameters = [...Object.values(updatesMap), emailKey];

    await makeDbCallAsPromise(`UPDATE users SET ${setFragments.join(', ')} WHERE email = ?`, queryParameters);
    return response.json({success: true});
  } catch (error) {
    console.error('Error updating contact:', error);
    return response.status(500).json({error: 'Database error'});
  }
});

/**
 * Parse and validate the users "email list" filter criteria from query
 * parameters. Shared by the count-preview and email-request endpoints so the
 * parsing/validation logic lives in one place.
 *
 * Recognised query params — one per filterable field (see
 * getUserEmailFilterFieldDefinitions() in services/tableMetadata.js): region
 * (comma-separated codes, e.g. "EU,NA"), institution, title, workingGroup
 * (substring match), level, privileges (exact match).
 *
 * @param {import('express').Request} request
 * @returns {object} filterCriteria
 * @throws {Error} with code 'INVALID_REGION_CODE' when an unrecognised region
 *   code is supplied.
 */
function parseUserEmailFilterCriteriaFromQuery(request) {
  const filterCriteria = {};
  for (const filterFieldDefinition of getUserEmailFilterFieldDefinitions()) {
    const rawValue = request.query ? request.query[filterFieldDefinition.fieldName] : undefined;
    if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
      filterCriteria[filterFieldDefinition.fieldName] = rawValue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(filterCriteria, 'region')) {
    const regionValidation = validateRegionCodes(filterCriteria.region);
    if (!regionValidation.ok) {
      const error = new Error(`Invalid region code: ${regionValidation.invalid}`);
      error.code = 'INVALID_REGION_CODE';
      throw error;
    }
    filterCriteria.region = regionValidation.value;
  }

  return filterCriteria;
}

/**
 * Return the count of distinct email addresses for users matching the
 * provided filters. Deliberately never returns the addresses themselves —
 * requesters only need to know how many people will receive the email.
 *
 * At least one non-empty filter must be supplied. Multiple filters are
 * combined with AND.
 */
router.get('/users/email-count', isAuthenticated, isApprover, async (request, response) => {
  try {
    let filterCriteria;
    try {
      filterCriteria = parseUserEmailFilterCriteriaFromQuery(request);
    } catch (error) {
      return response.status(400).json({error: error.message});
    }

    let sql;
    let parameters;
    try {
      ({sql, parameters} = buildUserEmailFilterQuery(filterCriteria));
    } catch (error) {
      if (error.code === 'INVALID_FILTER_CRITERIA' || error.code === 'INVALID_FILTER_FIELD') {
        return response.status(400).json({error: error.message});
      }
      throw error;
    }

    const countSql = `SELECT COUNT(*) AS count FROM (${sql}) AS matched_recipients`;
    const rows = await makeDbCallAsPromise(countSql, parameters);
    const count = (rows && rows[0] && rows[0].count) || 0;
    return response.json({count});
  } catch (error) {
    console.error('Error counting emails by filter:', error);
    return response.status(500).json({error: 'Database error'});
  }
});

/**
 * Create an email send request: resolves the recipient list from the
 * supplied filters once (snapshotted for a later Executive-approval step),
 * and stores it alongside the subject/HTML body. Never returns the
 * recipient addresses — only a count.
 *
 * Body: { filterCriteria: object, subject: string, htmlBody: string }
 */
router.post('/email-requests', isAuthenticated, isApprover, async (request, response) => {
  try {
    const {filterCriteria, subject, htmlBody} = request.body || {};

    if (!filterCriteria || typeof filterCriteria !== 'object' || Array.isArray(filterCriteria)) {
      return response.status(400).json({error: 'filterCriteria must be an object'});
    }

    if (Object.prototype.hasOwnProperty.call(filterCriteria, 'region')) {
      const regionValidation = validateRegionCodes(filterCriteria.region);
      if (!regionValidation.ok) {
        return response.status(400).json({error: `Invalid region code: ${regionValidation.invalid}`});
      }
      filterCriteria.region = regionValidation.value;
    }

    const result = await createEmailSendRequest(pool, {
      requestedBy: request.session.user,
      subject,
      htmlBody,
      filterCriteria,
    });

    return response.status(201).json({success: true, id: result.id, recipientCount: result.recipientCount});
  } catch (error) {
    if (
      error.code === 'INVALID_EMAIL_REQUEST' ||
      error.code === 'INVALID_FILTER_CRITERIA' ||
      error.code === 'INVALID_FILTER_FIELD'
    ) {
      return response.status(400).json({error: error.message});
    }
    console.error('Error creating email send request:', error);
    return response.status(500).json({error: 'Error creating email send request'});
  }
});

// ---------------------------------------------------------------------------
// Email send request review (Executive approve / reject)
// ---------------------------------------------------------------------------

/**
 * Kick off the actual Brevo send for an approved email request without
 * blocking the HTTP response. Never throws — any failure here (including a
 * missing Brevo API key) is caught, logged, and still recorded via
 * markEmailSendRequestSent() so the row doesn't sit stuck at 'approved'
 * indefinitely with no explanation.
 *
 * @param {number} id
 * @param {{subject: string, htmlBody: string, recipients: string[]}} approvedRequest
 */
async function sendApprovedEmailRequestInBackground(id, approvedRequest) {
  console.log(`[EmailSendRequest #${id}] background send starting (${(approvedRequest.recipients || []).length} recipient(s))`);
  try {
    const {succeeded, failed} = await sendToAllRecipientsIndividually({
      apiKey: config.BREVO_API_KEY,
      senderEmail: config.EMAIL_FROM,
      recipients: approvedRequest.recipients,
      subject: approvedRequest.subject,
      htmlContent: approvedRequest.htmlBody,
    });
    await markEmailSendRequestSent(pool, {id, succeeded, failed});
  } catch (error) {
    console.error(`[EmailSendRequest #${id}] background send crashed before completion:`, error);
    try {
      await markEmailSendRequestSent(pool, {
        id,
        succeeded: [],
        failed: (approvedRequest.recipients || []).map(email => ({email, error: error.message || String(error)})),
      });
    } catch (markError) {
      console.error(`[EmailSendRequest #${id}] failed to record the send crash:`, markError);
    }
  }
}

/**
 * Approve or reject a pending email send request.
 *
 * Reject: marks the row 'rejected'; nothing is sent.
 * Approve: marks the row 'approved' and responds immediately, then sends to
 * every snapshotted recipient in the background (one Brevo call per
 * recipient — see services/brevoService.js), finally marking the row 'sent'.
 *
 * Body: { decision: 'approve'|'reject', comments?: string }
 */
router.post('/email-requests/:id/review', isAuthenticated, isExec, async (request, response) => {
  const {decision, comments} = request.body || {};
  const id = coerceToInteger(request.params.id);

  try {
    if (id === null) {
      return response.status(400).json({error: 'Invalid id'});
    }
    if (!isValidReviewDecision(decision)) {
      return response.status(400).json({error: 'Invalid decision'});
    }

    const reviewComments = normalizeComments(comments);
    const normalizedDecision = decision.toLowerCase();

    console.log(`[EmailSendRequest #${id}] ${normalizedDecision} decision received from ${request.session.user}`);

    if (normalizedDecision === 'reject') {
      await rejectEmailSendRequest(pool, {id, approver: request.session.user, comments: reviewComments});
      return response.status(200).json({status: 'Rejected'});
    }

    const approvedRequest = await approveEmailSendRequest(pool, {id, approver: request.session.user, comments: reviewComments});
    response.status(200).json({status: 'Approved'});

    // Intentionally not awaited: the executive's request already got its response above.
    sendApprovedEmailRequestInBackground(id, approvedRequest);
  } catch (error) {
    console.error(`[EmailSendRequest #${id}] review failed:`, error);
    if (!response.headersSent) {
      response.status(500).json({error: 'Error reviewing email send request: ' + error.message});
    }
  }
});

export default router;
