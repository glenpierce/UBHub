/**
 * Service for creating pending changes (row_versions rows).
 *
 * Encapsulates validation, version computation, and the transactional insert.
 * Accepts a pool or connection via dependency injection so callers can test
 * with mocks.
 */

import { assertTableAllowed } from './tableMetadata.js';
import { coerceToInteger } from '../utils/validationUtils.js';

/**
 * Validate that an inst_id value references an existing location.
 *
 * Uses the provided databaseConnection so the check runs inside the same
 * transaction when needed.
 *
 * @param {object} databaseConnection - A mysql2 connection or pool that supports .query().
 * @param {*}      instIdValue        - The raw inst_id value from the payload.
 * @throws {Error} with code 'INVALID_INST_ID' when the id is not a valid integer
 *                 or does not exist in the locations table.
 */
export async function validateInstitutionIdExists(databaseConnection, instIdValue) {
  const numericId = coerceToInteger(instIdValue);

  if (numericId === null) {
    const error = new Error('Invalid inst_id');
    error.code = 'INVALID_INST_ID';
    throw error;
  }

  const [locationRows] = await databaseConnection.query(
    'SELECT 1 FROM `locations` WHERE id = ? LIMIT 1',
    [numericId],
  );

  if (!locationRows || locationRows.length === 0) {
    const error = new Error('Referenced location not found');
    error.code = 'INVALID_INST_ID';
    throw error;
  }
}

/**
 * Return true when the given table + data combination requires inst_id validation.
 *
 * @param {string} tableName
 * @param {object} dataObject
 * @returns {boolean}
 */
function requiresInstitutionIdValidation(tableName, dataObject) {
  return (
    (tableName === 'documents' || tableName === 'participation') &&
    dataObject &&
    Object.prototype.hasOwnProperty.call(dataObject, 'inst_id')
  );
}

/**
 * Create a new pending change (row_versions row) inside a transaction.
 *
 * @param {object} pool       - mysql2 connection pool.
 * @param {string} tableName  - Target table name.
 * @param {object} rowKeyObject - Primary-key object (may be empty for inserts).
 * @param {string} operation  - One of 'insert', 'update', 'delete'.
 * @param {object} dataObject - Column values.
 * @param {string} user       - Username of the submitter.
 * @returns {Promise<void>}
 */
export async function createPendingChange(pool, tableName, rowKeyObject, operation, dataObject, user) {
  assertTableAllowed(tableName);

  const primaryKeyJson = JSON.stringify(rowKeyObject || {});
  const dataJson = JSON.stringify(dataObject || {});

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (requiresInstitutionIdValidation(tableName, dataObject)) {
      await validateInstitutionIdExists(connection, dataObject.inst_id);
    }

    const [versionRows] = await connection.query(
      "SELECT COALESCE(MAX(version),0) + 1 AS next_version FROM row_versions WHERE table_name = ? AND JSON_UNQUOTE(JSON_EXTRACT(row_key, '$')) = ?",
      [tableName, primaryKeyJson],
    );
    const nextVersion = (versionRows[0] && versionRows[0].next_version) || 1;

    await connection.query(
      'INSERT INTO row_versions (table_name, row_key, operation, data, version, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [tableName, primaryKeyJson, operation, dataJson, nextVersion, user],
    );

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
    connection.release();
  }
}

