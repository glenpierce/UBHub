/**
 * Pure-function query builder for the users "email list" feature.
 *
 * Accepts a validated filter-criteria object and returns a parameterized SQL
 * SELECT DISTINCT email statement. No database access – this module only
 * builds strings, mirroring the style of services/queryBuilder.js.
 */

import { getUserEmailFilterFieldDefinitions } from './tableMetadata.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a Map of fieldName → filter-field-definition for fast, safe lookups.
 * Rebuilt on every call so tests can mutate underlying metadata freely.
 *
 * @returns {Map<string, object>}
 */
function buildFilterFieldDefinitionsByName() {
  const filterFieldDefinitionsByName = new Map();
  for (const filterFieldDefinition of getUserEmailFilterFieldDefinitions()) {
    filterFieldDefinitionsByName.set(filterFieldDefinition.fieldName, filterFieldDefinition);
  }
  return filterFieldDefinitionsByName;
}

/**
 * Build the SQL fragment and bound parameters for a single filter field.
 * Returns null when the provided value does not yield any usable condition
 * (for example an empty string), so the caller can skip the field entirely.
 *
 * @param {object} filterFieldDefinition - The trusted field definition (never user input).
 * @param {*} rawValue - The raw filter value supplied by the caller.
 * @returns {{sql: string, parameters: Array<*>}|null}
 */
function buildFilterFragment(filterFieldDefinition, rawValue) {
  const {fieldName, comparisonType} = filterFieldDefinition;
  const quotedColumnName = `\`${fieldName}\``;

  if (comparisonType === 'commaSeparatedSet') {
    const individualCodes = String(rawValue == null ? '' : rawValue)
      .split(',')
      .map(code => code.trim())
      .filter(Boolean);
    if (individualCodes.length === 0) {
      return null;
    }
    const conditions = individualCodes.map(() => `FIND_IN_SET(?, ${quotedColumnName})`);
    return {sql: `(${conditions.join(' OR ')})`, parameters: individualCodes};
  }

  if (comparisonType === 'containsSubstring') {
    const trimmedValue = String(rawValue == null ? '' : rawValue).trim();
    if (!trimmedValue) {
      return null;
    }
    return {sql: `${quotedColumnName} LIKE ?`, parameters: [`%${trimmedValue}%`]};
  }

  if (comparisonType === 'exactMatch') {
    const trimmedValue = String(rawValue == null ? '' : rawValue).trim();
    if (!trimmedValue) {
      return null;
    }
    return {sql: `${quotedColumnName} = ?`, parameters: [trimmedValue]};
  }

  const error = new Error(`Unsupported comparison type "${comparisonType}" for field: ${fieldName}`);
  error.code = 'INVALID_FILTER_FIELD';
  throw error;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a parameterized `SELECT DISTINCT email FROM users` statement filtered
 * by the supplied filter criteria.
 *
 * @param {object} filterCriteria - Map of filterFieldName → raw filter value.
 *   Every key must match a definition returned by
 *   getUserEmailFilterFieldDefinitions(); unknown keys are rejected.
 * @returns {{sql: string, parameters: Array<*>}}
 * @throws {Error} with code 'INVALID_FILTER_CRITERIA' when no criteria are
 *   provided, or no criterion yields a usable condition.
 * @throws {Error} with code 'INVALID_FILTER_FIELD' when an unknown field name
 *   is supplied.
 */
export function buildUserEmailFilterQuery(filterCriteria) {
  if (!filterCriteria || typeof filterCriteria !== 'object' || Object.keys(filterCriteria).length === 0) {
    const error = new Error('At least one filter is required');
    error.code = 'INVALID_FILTER_CRITERIA';
    throw error;
  }

  const filterFieldDefinitionsByName = buildFilterFieldDefinitionsByName();
  const whereFragments = [];
  const parameters = [];

  for (const [suppliedFieldName, rawValue] of Object.entries(filterCriteria)) {
    const filterFieldDefinition = filterFieldDefinitionsByName.get(suppliedFieldName);
    if (!filterFieldDefinition) {
      const error = new Error(`Unknown filter field: ${suppliedFieldName}`);
      error.code = 'INVALID_FILTER_FIELD';
      throw error;
    }

    const fragment = buildFilterFragment(filterFieldDefinition, rawValue);
    if (!fragment) {
      continue;
    }
    whereFragments.push(fragment.sql);
    parameters.push(...fragment.parameters);
  }

  if (whereFragments.length === 0) {
    const error = new Error('At least one non-empty filter value is required');
    error.code = 'INVALID_FILTER_CRITERIA';
    throw error;
  }

  const sql =
    `SELECT DISTINCT email FROM users WHERE ${whereFragments.join(' AND ')} ` +
    "AND email IS NOT NULL AND TRIM(email) <> ''";

  return {sql, parameters};
}

