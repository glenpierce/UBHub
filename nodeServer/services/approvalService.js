/**
 * Service for reviewing (approving / rejecting) pending changes.
 *
 * Each public function acquires a connection from the pool, runs its logic
 * inside a transaction, and releases the connection on completion.
 */

import { assertTableAllowed, getEditableTableMetadata } from './tableMetadata.js';
import { coerceToInteger } from '../utils/validationUtils.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a JSON string; return the original value when parsing fails.
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
    return value;
  }
}

/**
 * Fetch and lock a row_versions row, validating that it exists and has an
 * acceptable status.
 *
 * @param {object}   connection       - A mysql2 connection inside a transaction.
 * @param {number}   versionId        - row_versions.id
 * @param {string[]} allowedStatuses  - e.g. ['pending'] or ['pending','rejected']
 * @returns {Promise<object>} The locked row.
 */
async function fetchAndLockVersion(connection, versionId, allowedStatuses) {
  const [rows] = await connection.query(
    'SELECT * FROM row_versions WHERE id = ? FOR UPDATE',
    [versionId],
  );

  if (!rows[0]) {
    throw new Error('Version not found');
  }

  const rowVersion = rows[0];
  const normalizedStatus = String(rowVersion.status || '').trim().toLowerCase();

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(`Version status is "${rowVersion.status}", expected one of: ${allowedStatuses.join(', ')}`);
  }

  return rowVersion;
}

/**
 * Mark a row_versions row with a review decision.
 *
 * @param {object}      connection
 * @param {number}      versionId
 * @param {string}      status     - 'approved' or 'rejected'
 * @param {string}      approver
 * @param {string|null} comments
 */
async function markVersionReviewed(connection, versionId, status, approver, comments) {
  await connection.query(
    'UPDATE row_versions SET status = ?, approved_by = ?, approved_at = NOW(), notes = ? WHERE id = ?',
    [status, approver, comments, versionId],
  );
}

/**
 * Validate inst_id at approval time using the current transaction connection.
 *
 * @param {object} connection
 * @param {string} tableName
 * @param {object} validData
 */
async function validateInstitutionIdAtApprovalTime(connection, tableName, validData) {
  if (
    (tableName !== 'documents' && tableName !== 'participation') ||
    !Object.prototype.hasOwnProperty.call(validData, 'inst_id')
  ) {
    return;
  }

  const numericId = coerceToInteger(validData['inst_id']);

  if (numericId === null) {
    throw new Error('Invalid inst_id in pending change');
  }

  const [locationRows] = await connection.query(
    'SELECT 1 FROM `locations` WHERE id = ? LIMIT 1',
    [numericId],
  );

  if (!locationRows || locationRows.length === 0) {
    throw new Error('Referenced location not found at approval time');
  }
}

/**
 * Filter a data object down to only the columns allowed for a table.
 *
 * @param {object} dataObject
 * @param {string[]} allowedColumns
 * @returns {object}
 */
function sanitizeDataToAllowedColumns(dataObject, allowedColumns) {
  const sanitized = {};
  for (const column of allowedColumns) {
    if (Object.prototype.hasOwnProperty.call(dataObject, column)) {
      sanitized[column] = dataObject[column];
    }
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// DML builders – one small function per operation
// ---------------------------------------------------------------------------

/**
 * Run an INSERT for an approved pending change.
 */
async function executeInsert(connection, tableName, validData) {
  const columns = Object.keys(validData);

  if (columns.length === 0) {
    throw new Error('No insertable columns');
  }

  const placeholders = columns.map(() => '?').join(', ');
  const columnList = columns.map(column => `\`${column}\``).join(', ');
  const statement = `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${placeholders})`;
  const values = columns.map(column => validData[column]);

  await connection.query(statement, values);
}

/**
 * Run an UPDATE for an approved pending change.
 */
async function executeUpdate(connection, tableName, validData, rowKeyObject, primaryKeyColumns) {
  const setColumns = Object.keys(validData).filter(key => !primaryKeyColumns.includes(key));

  if (setColumns.length === 0) {
    return; // nothing to update
  }

  const whereKeys = Object.keys(rowKeyObject);
  if (whereKeys.length === 0) {
    throw new Error('Missing primary key in row_key for update');
  }

  const setClause = setColumns.map(column => `\`${column}\` = ?`).join(', ');
  const setValues = setColumns.map(column => validData[column]);

  const whereClause = whereKeys.map(key => `\`${key}\` = ?`).join(' AND ');
  const whereValues = whereKeys.map(key => rowKeyObject[key]);

  const statement = `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause} LIMIT 1`;
  await connection.query(statement, [...setValues, ...whereValues]);
}

/**
 * Run a DELETE for an approved pending change.
 */
async function executeDelete(connection, tableName, rowKeyObject) {
  const whereKeys = Object.keys(rowKeyObject);

  if (whereKeys.length === 0) {
    throw new Error('Missing primary key in row_key for delete');
  }

  const whereClause = whereKeys.map(key => `\`${key}\` = ?`).join(' AND ');
  const whereValues = whereKeys.map(key => rowKeyObject[key]);

  const statement = `DELETE FROM \`${tableName}\` WHERE ${whereClause} LIMIT 1`;
  await connection.query(statement, whereValues);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reject a pending change.
 *
 * @param {object}      pool      - mysql2 connection pool.
 * @param {number}      versionId - row_versions.id
 * @param {string}      approver  - Reviewer username.
 * @param {string|null} comments  - Optional review comments.
 */
export async function rejectVersion(pool, versionId, approver, comments) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await fetchAndLockVersion(connection, versionId, ['pending']);
    await markVersionReviewed(connection, versionId, 'rejected', approver, comments);

    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Failed to release connection:', releaseError);
      }
    }
  }
}

/**
 * Approve a pending change and apply the corresponding DML.
 *
 * @param {object}      pool      - mysql2 connection pool.
 * @param {number}      versionId - row_versions.id
 * @param {string}      approver  - Reviewer username.
 * @param {string|null} comments  - Optional review comments.
 */
export async function approveVersion(pool, versionId, approver, comments) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const rowVersion = await fetchAndLockVersion(connection, versionId, ['pending', 'rejected']);

    const tableName = rowVersion.table_name;
    assertTableAllowed(tableName);
    const editableMetadata = getEditableTableMetadata(tableName);

    const rowKeyObject = safeJsonParse(rowVersion.row_key);
    const dataObject = safeJsonParse(rowVersion.data);

    const validData = sanitizeDataToAllowedColumns(dataObject, editableMetadata.columns);

    await validateInstitutionIdAtApprovalTime(connection, tableName, validData);

    if (rowVersion.operation === 'insert') {
      await executeInsert(connection, tableName, validData);
    } else if (rowVersion.operation === 'update') {
      await executeUpdate(connection, tableName, validData, rowKeyObject, editableMetadata.primaryKey);
    } else if (rowVersion.operation === 'delete') {
      await executeDelete(connection, tableName, rowKeyObject);
    } else {
      throw new Error('Unknown operation');
    }

    await markVersionReviewed(connection, versionId, 'approved', approver, comments);

    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Failed to release connection:', releaseError);
      }
    }
  }
}

