/**
 * Pure-function query builder for the /table-data endpoint.
 *
 * Accepts table metadata and returns parameterized SQL and select-part arrays.
 * No database access – this module only builds strings.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return true when the lookup-part string starts with 'json:'.
 *
 * @param {string} part
 * @returns {boolean}
 */
function isJsonLookupPart(part) {
  return String(part).toLowerCase().startsWith('json:');
}

/**
 * Strip the leading 'json:' prefix from a lookup-part.
 *
 * @param {string} part
 * @returns {string} The JSON path (e.g. '$.inst_id').
 */
function extractJsonPath(part) {
  return String(part).replace(/^json:/i, '');
}

/**
 * Find a joinable lookup part, preferring a plain column name over a JSON
 * path.  Falls back to a JSON path that looks like it contains an id.
 *
 * @param {string[]} lookupParts - Array of pipe-separated lookup fragments.
 * @returns {string|undefined}
 */
function findJoinablePart(lookupParts) {
  const plainColumn = lookupParts.find(part => !isJsonLookupPart(part));
  if (plainColumn) {
    return plainColumn;
  }
  return lookupParts.find(
    part => isJsonLookupPart(part) && (part.toLowerCase().includes('inst_id') || part.toLowerCase().includes('id')),
  );
}

/**
 * Find a fallback JSON path that is likely to carry the inst_title value.
 *
 * @param {string[]} lookupParts
 * @param {string}   joinPart - The part already selected for the JOIN.
 * @returns {string|undefined}
 */
function findFallbackJsonPart(lookupParts, joinPart) {
  return (
    lookupParts.find(part => isJsonLookupPart(part) && part.toLowerCase().includes('inst_title')) ||
    lookupParts.find(part => isJsonLookupPart(part) && part !== joinPart)
  );
}

// ---------------------------------------------------------------------------
// Build a single cross-reference fragment
// ---------------------------------------------------------------------------

/**
 * Build the JOIN clause and SELECT expression for one cross-reference column.
 *
 * @param {object} options
 * @param {string} options.tableName      - The base table being queried.
 * @param {string} options.crossTable     - The referenced table.
 * @param {string} options.lookupColumnRaw - Pipe-separated lookup spec (e.g. 'inst_id' or 'json:$.inst_id|json:$.inst_title').
 * @param {string} options.joinedColumn   - The column to select from the cross table.
 * @param {object} options.joinAliases    - Mutable map of aliasKey → alias (for reuse).
 * @returns {{ joinClause: string|null, selectExpression: string }}
 */
function buildCrossReferenceFragment({ tableName, crossTable, lookupColumnRaw, joinedColumn, joinAliases }) {
  const lookupParts = lookupColumnRaw.split('|').map(part => part.trim()).filter(Boolean);
  const joinPart = findJoinablePart(lookupParts);
  const aliasKey = `${crossTable}__${lookupColumnRaw}`;

  if (joinPart) {
    return buildJoinedFragment({ tableName, crossTable, joinPart, joinedColumn, lookupParts, aliasKey, joinAliases });
  }

  return buildFallbackFragment({ tableName, lookupParts, joinedColumn });
}

/**
 * Build fragment when a joinable lookup part exists.
 */
function buildJoinedFragment({ tableName, crossTable, joinPart, joinedColumn, lookupParts, aliasKey, joinAliases }) {
  let joinClause = null;
  let alias = joinAliases[aliasKey];

  if (!alias) {
    alias = `${crossTable}_x`;
    let counter = 1;
    while (Object.values(joinAliases).includes(alias)) {
      alias = `${crossTable}_x${counter++}`;
    }
    joinAliases[aliasKey] = alias;

    if (isJsonLookupPart(joinPart)) {
      const jsonPath = extractJsonPath(joinPart);
      joinClause = `LEFT JOIN \`${crossTable}\` AS \`${alias}\` ON CAST(JSON_UNQUOTE(JSON_EXTRACT(\`${tableName}\`.\`data\`, '${jsonPath}')) AS UNSIGNED) = \`${alias}\`.\`id\``;
    } else {
      joinClause = `LEFT JOIN \`${crossTable}\` AS \`${alias}\` ON \`${tableName}\`.\`${joinPart}\` = \`${alias}\`.\`id\``;
    }
  }

  const fallbackJsonPart = findFallbackJsonPart(lookupParts, joinPart);
  let selectExpression;

  if (fallbackJsonPart) {
    const fallbackJsonPath = extractJsonPath(fallbackJsonPart);
    selectExpression = `COALESCE(\`${alias}\`.\`${joinedColumn}\`, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(\`${tableName}\`.\`data\`, '${fallbackJsonPath}')), '')) AS \`${joinedColumn}\``;
  } else {
    selectExpression = `\`${alias}\`.\`${joinedColumn}\` AS \`${joinedColumn}\``;
  }

  return { joinClause, selectExpression };
}

/**
 * Build fragment when no joinable lookup part is found (pure fallback).
 */
function buildFallbackFragment({ tableName, lookupParts, joinedColumn }) {
  const firstJsonPart = lookupParts.find(isJsonLookupPart);

  if (firstJsonPart) {
    const jsonPath = extractJsonPath(firstJsonPart);
    return {
      joinClause: null,
      selectExpression: `JSON_UNQUOTE(JSON_EXTRACT(\`${tableName}\`.\`data\`, '${jsonPath}')) AS \`${joinedColumn}\``,
    };
  }

  const firstPart = lookupParts[0];
  return {
    joinClause: null,
    selectExpression: `\`${tableName}\`.\`${firstPart}\` AS \`${joinedColumn}\``,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a full SELECT query string for the /table-data endpoint.
 *
 * @param {object}  options
 * @param {string}  options.tableName   - The table to query.
 * @param {object}  options.serverMeta  - Server-side table metadata (with raw cross-reference definitions).
 * @param {number}  [options.limit=2000] - Maximum rows to return.
 * @returns {{ sql: string, parameters: Array<*> }}
 */
export function buildTableDataQuery({ tableName, serverMeta, limit = 2000 }) {
  if (!tableName || !serverMeta || !Array.isArray(serverMeta.columns)) {
    const error = new Error('Invalid query specification: tableName and serverMeta with columns are required');
    error.code = 'INVALID_QUERY_SPEC';
    throw error;
  }

  const selectParts = [];
  const joinClauses = [];
  const joinAliases = {};

  for (const column of serverMeta.columns) {
    if (column.crossReferenceTable && column.lookupColumn && column.joinedColumn) {
      const fragment = buildCrossReferenceFragment({
        tableName,
        crossTable: column.crossReferenceTable,
        lookupColumnRaw: String(column.lookupColumn),
        joinedColumn: column.joinedColumn,
        joinAliases,
      });

      if (fragment.joinClause) {
        joinClauses.push(fragment.joinClause);
      }
      selectParts.push(fragment.selectExpression);
    } else if (column.name) {
      selectParts.push(`\`${tableName}\`.\`${column.name}\` AS \`${column.name}\``);
    }
    // Skip button-only columns (no name, no cross-reference).
  }

  if (selectParts.length === 0) {
    return { sql: null, parameters: [] };
  }

  const sql = `SELECT ${selectParts.join(', ')} FROM \`${tableName}\` ${joinClauses.join(' ')} LIMIT ${Number(limit)}`;

  return { sql, parameters: [] };
}

