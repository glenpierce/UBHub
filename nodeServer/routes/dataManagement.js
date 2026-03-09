/**
 * Data-management routes.
 *
 * This module is a thin orchestration layer: it parses requests, delegates to
 * services, and formats HTTP responses.  Business logic, SQL generation, and
 * validation live in dedicated service and utility modules.
 */

import express from 'express';
import {pool, makeDbCallAsPromise} from '../ConnectionPool.js';
import {isAuthenticated, isContributor, isApprover} from '../middleware/authMiddleware.js';
import {
  getTablesForUser,
  getNavigationMenuForUser,
  getServerTableMetadata,
} from '../services/tableMetadata.js';
import {buildTableDataQuery} from '../services/queryBuilder.js';
import {createPendingChange} from '../services/pendingChangeService.js';
import {approveVersion, rejectVersion} from '../services/approvalService.js';
import {
  coerceToInteger,
  isNonEmptyString,
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

export default router;
