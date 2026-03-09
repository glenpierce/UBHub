# Refactor Plan: Reduce Cognitive Complexity in nodeServer/routes/dataManagement.js

Purpose

This document describes a focused, actionable plan to reduce cognitive and cyclomatic complexity in `nodeServer/routes/dataManagement.js`. The goal is to improve clarity, modularity, and testability while preserving existing runtime behavior and HTTP contracts.

High-level approach

- Break the large route file into small, single-responsibility modules (metadata, query building, pending-change domain logic, approval logic, validation, auth middleware, and transaction helper).
- Keep route handlers thin orchestration layers: parse -> validate -> authorize -> call services -> format response.
- Introduce small, testable pure functions and dependency injection for database clients so logic can be unit tested without a live DB.
- Rollout changes incrementally, one small PR at a time, with unit tests added for each new module.

Quick checklist (what I'll deliver in this plan)

- [x] Problem summary and design goals
- [x] Proposed module decomposition and contracts
- [x] Prioritized incremental refactor tasks (PR-sized) with estimates and acceptance tests
- [x] Unit and integration test guidance (including repository Docker test instructions)
- [x] Coding patterns and quality gates
- [x] Rollback and PR review checklist
- [x] A short example refactor for the join-building logic used by `/table-data`

1) Problems observed (concise)

- `dataManagement.js` mixes many responsibilities (routing, validation, SQL composition, transaction management, domain logic).
- Several long functions with deep nesting and many conditional branches increase cognitive complexity and reduce testability.
- Duplicate validation logic and inline SQL composition make unit testing hard and encourage regression.
- Direct use of the connection pool and inline transactions makes mocking and unit testing difficult.

2) Design goals and constraints

Goals (aligned to project style):
- Simplicity: small, well-named functions and modules.
- Correctness: preserve existing HTTP responses and behavior.
- Consistency: naming and style follow the repo's MIT/Stanford guide (no abbreviations, descriptive names, camelCase for functions/vars, PascalCase for classes).
- Completeness: handle expected edge cases and add tests to cover them.

Constraints:
- No breaking changes to external API (routes and response shapes remain unchanged without an explicit decision).
- Avoid adding large runtime dependencies; test-only dev-deps are acceptable.
- Changes must be incremental and reversible.

3) Decomposition: proposed new modules and responsibilities

Place new files under `nodeServer/` using existing folder conventions.

- `nodeServer/services/tableMetadata.js`
  - Responsibility: central source of truth for table metadata (columns, display names, cross-reference hints).
  - Exports: `getTableMetadata(tableName)`, `listAvailableTables()`.

- `nodeServer/services/queryBuilder.js`
  - Responsibility: build parameterized SELECT SQL, including JOIN fragments and column aliases. Return { sql, parameters }.
  - Exports: `buildSelectQuery(options)`.

- `nodeServer/services/joinBuilder.js` (optional split)
  - Responsibility: build JOIN SQL fragments from cross-reference metadata and JSON lookup hints.
  - Exports: `buildJoinsForTable(tableName, columns, metadataProvider)`.

- `nodeServer/services/pendingChangeService.js`
  - Responsibility: create pending changes, compute next version, and list pending changes. Accepts a `transactionClient` or `pool`.
  - Exports: `createPendingChange(dbClientOrPool, payload)`.

- `nodeServer/services/approvalService.js`
  - Responsibility: apply approvals and rejections; run DML (INSERT/UPDATE/DELETE) inside provided transactions.
  - Exports: `approveVersion(dbClient, versionId, approver, comments)`, `rejectVersion(dbClient, versionId, approver, comments)`.

- `nodeServer/utils/validationUtils.js`
  - Responsibility: centralized validation helpers (validate table name, numeric ids, payload shapes).
  - Exports: `validateTableNameForUser(tableName, userPrivileges)`, `coerceToInteger(value)`, `validateInstIdExists(dbClientOrPool, instId)`.

- `nodeServer/middleware/authMiddleware.js`
  - Responsibility: reusable Express middleware for authentication and role checks (isAuthenticated, isContributor, isApprover, isExec).
  - Exports: `requireAuthentication`, `requireRole(minPrivilegeLevel)`.

- `nodeServer/db/transactionHelper.js`
  - Responsibility: helper `withTransaction(pool, asyncCallback)` that acquires a connection, begins transaction, invokes the callback with the connection, commits or rolls back, and releases.

4) Module contracts and example signatures

Keep signatures simple and test-friendly. Use dependency injection for DB clients.

- tableMetadata.js
  - getTableMetadata(tableName: string) => object
  - listAvailableTables() => string[]
  - Throws: Error with code = 'UnknownTable' for unknown names

- queryBuilder.js
  - buildSelectQuery({ tableName, clientMeta, serverMeta, limit = 2000 }) => { sql: string, parameters: any[] }
  - Throws: Error('InvalidQuerySpec') for malformed inputs

- joinBuilder.js
  - buildJoinFragments(tableName, serverMetaColumns) => { joinSql: string, selectParts: string[] }
  - Pure functions; no DB access

- pendingChangeService.js
  - async createPendingChange(poolOrClient, { tableName, rowKey, operation, data, user }) => { insertedVersionId }
  - Must validate inputs and throw domain errors: { code: 'INVALID_TABLE'|'INVALID_INST_ID'|'MISSING_PK' }

- approvalService.js
  - async approveVersion(client, versionId, approver, comments) => { success: boolean }
  - async rejectVersion(client, versionId, approver, comments) => { success: boolean }
  - Throws domain errors: { code: 'VERSION_NOT_FOUND'|'INVALID_STATE'|'REFERENCED_MISSING' }

- validationUtils.js
  - function coerceToInteger(value) => number|null
  - function isNonEmptyString(value) => boolean
  - function validateTableAllowed(tableName) => void (throws if not allowed)

- transactionHelper.js
  - async function withTransaction(pool, callback) => callbackResult
  - Ensures commit on success and rollback on error, always releases connection

5) Prioritized incremental refactor tasks (PR-sized)

Order tasks to minimize risk: start with read-only and pure extractions, then tackle transaction-heavy and DML logic.

Task 1 — Extract table metadata (small)
- Add `nodeServer/services/tableMetadata.js` and move the `tables` constant into it.
- Replace inline `tables` usage in `dataManagement.js` with `getTableMetadata` and `listAvailableTables()`.
- Tests: unit tests for metadata retrieval and validation that `getTablesForUser` behaviour remains identical.
- Acceptance: No change to API responses; existing unit tests pass.

Task 2 — Centralize validation utilities (small)
- Add `nodeServer/utils/validationUtils.js`.
- Replace duplicated `inst_id` and numeric coercion logic with `coerceToInteger` and `validateInstIdExists` helper.
- Tests: unit tests for coercion and validation (mock DB call for existence).

Task 3 — Extract auth middleware (small)
- Move `isAuthenticated`, `isContributor`, `isApprover`, `isExec` to `nodeServer/middleware/authMiddleware.js` and import these in the route file.
- Tests: middleware unit tests asserting 401/403 responses.

Task 4 — Add transaction helper (small)
- Implement `withTransaction(pool, callback)`.
- Replace one inline transaction usage (e.g., createPendingChange) to use the helper as a proof-of-concept.
- Tests: unit test mocking a pool/client to assert commit and rollback behaviour.

Task 5 — Extract query and join building (medium)
- Add `nodeServer/services/queryBuilder.js` and optional `joinBuilder.js`.
- Move the SQL composition logic used for `/table-data/:tableName` into `buildSelectQuery` that returns safe parameterized SQL and select column aliases.
- Replace the route handler body to call the builder and run the SQL via `makeDbCallAsPromise`.
- Tests: unit tests for queryBuilder covering join cases, JSON-extraction fallback paths, and alias reuse. Integration test for `/table-data` to verify parity with previous output.

Task 6 — Extract pending-change creation logic (medium)
- Move `createPendingChange` into `pendingChangeService.js` and make it accept a `dbClientOrPool` and rely on `withTransaction`.
- Tests: unit tests for validation paths, insertion path (mock DB), and race-condition checks.

Task 7 — Extract approval / apply-version logic (medium)
- Move `approveVersion`/`rejectVersion` into `approvalService.js`. Ensure it uses DI for DB client and throws clear domain errors.
- Tests: unit tests for approval logic and edge cases (missing PK, invalid inst_id, version state not pending).

Task 8 — Replace route with thin orchestra layer and add integration tests (medium)
- After services exist, simplify `dataManagement.js` to perform wiring and error mapping only.
- Add integration tests that exercise the endpoints against a test DB (use the repo's Docker-based tests described in `nodeServer/TESTING.md`).

Task 9 — Clean up and add complexity/size checks to CI (small)
- Add lint/complexity checks (recommend an eslint plugin or a simple Node script to enforce function size and branch counts). Add thresholds and fail PRs that exceed them.
- Tests: CI runs lint + unit tests.

Estimate legend: small = < 4 hours, medium = 1–2 days

6) Tests to add (suggested list)

Unit tests (new files under `nodeServer/test/`):
- `tableMetadata.test.js`: known table names return expected metadata; unknown throws.
- `validationUtils.test.js`: `coerceToInteger` edge cases; `validateInstIdExists` returns false for missing ids (mock DB).
- `authMiddleware.test.js`: 401 and 403 flows.
- `transactionHelper.test.js`: commit and rollback behaviour (mock pool/client).
- `queryBuilder.test.js`: multiple join scenarios, JSON fallback behavior, alias reuse.
- `pendingChangeService.test.js`: validation and insertion paths (mock DB client transactions).
- `approvalService.test.js`: approve/reject flows and error paths.

Integration tests:
- `dataManagement.integration.test.js`: smoke tests for `/table-data`, pending-change create, getLocationById, location-search and the approval endpoints.

How to run tests (project guidance)
- Matches repository: Use Docker-based test environment described in `nodeServer/TESTING.md`.
  - CI-style: docker compose -f docker-compose.test.yml up --build --abort-on-container-exit node-server-test


7) Coding patterns and guidelines (apply during refactors)

- Guard clauses / early returns to reduce nesting.
- Small pure functions that return explicit results (avoid hidden mutations).
- Single-responsibility modules and functions; aim for functions < 60 lines and ideally < 30.
- Descriptive names (no abbreviations, follow repository conventions).
- Explicit error codes (set Error.code) for domain errors so route layer can map to HTTP codes consistently.
- Use DI for DB access to facilitate mocking in unit tests.
- Keep SQL parameterized; avoid string interpolation of user input.
- Add JSDoc for public functions including param and return shapes.

8) CI / quality gates and metrics to track

Minimum gates for any PR touching these flows:
- Lint (existing project linter) passes
- Unit tests for new modules pass
- Integration smoke test for changed endpoints passes (in Docker-based test harness)

Suggested metrics to enforce over time:
- Cognitive complexity per function (target < 12)
- Function length (target < 60 lines)
- Branches per function (target < 10)
- Test coverage for modified modules (keep or improve current coverage)

9) Rollback and risk mitigation

- Make each change small and revertible.

10) PR review checklist (for reviewers and authors)

- Preserve HTTP response shapes and status codes
- Ensure that DB calls are parameterized and safe from injection
- New modules covered by unit tests (happy + error paths)?
- Functions short and single-responsibility? Any function with > 12 complexity should be broken down.
- Error objects must be emitted with clear codes/messages for mapping to HTTP errors.
- `withTransaction` is only used for transactional work and does it must properly release connections on all code paths
- Naming must be consistent with repository conventions (no abbreviations)?
- Is there a brief description of the acceptance tests and how to run them locally via Docker?

11) Example refactor: extract join-building into a small QueryBuilder utility

Below is a compact illustrative example showing how the join-building and select-part composition used in `/table-data` can be extracted into a small pure module. This example is intentionally minimal and focuses on clarity and testability.

// nodeServer/services/joinBuilder.js (illustrative snippet)
function isJsonPart(part) {
  return String(part).toLowerCase().startsWith('json:');
}
function jsonPathOf(part) {
  return String(part).replace(/^json:/i, '');
}

function buildJoinFragment({ tableName, crossTable, lookupColumnRaw, joinedColumn, aliasIndex }) {
  if (!crossTable || !lookupColumnRaw || !joinedColumn) {
    throw Object.assign(new Error('JoinResolutionFailed'), { code: 'JoinResolutionFailed' });
  }

  const lookupParts = String(lookupColumnRaw).split('|').map(p => p.trim()).filter(Boolean);
  const firstPlain = lookupParts.find(p => !isJsonPart(p));
  const alias = `${crossTable}_x${aliasIndex}`;

  if (firstPlain) {
    // plain column join
    const joinSql = `LEFT JOIN \`${crossTable}\` AS \`${alias}\` ON \`${tableName}\`.\`${firstPlain}\` = \`${alias}\`.\`id\``;
    const select = `\`${alias}\`.\`${joinedColumn}\` AS \`${joinedColumn}\``;
    return { joinSql, select };
  }

  // fallback to JSON extraction in the row's data column
  const jsonPart = lookupParts.find(isJsonPart);
  if (jsonPart) {
    const path = jsonPathOf(jsonPart);
    const select = `JSON_UNQUOTE(JSON_EXTRACT(\`${tableName}\`.\`data\`, '${path}')) AS \`${joinedColumn}\``;
    return { joinSql: '', select };
  }

  // if no joinable part, select empty string to keep column order stable
  return { joinSql: '', select: `'' AS \`${joinedColumn}\`` };
}

function buildJoinsForColumns(tableName, columns) {
  const joinClauses = [];
  const selectParts = [];
  let aliasCounter = 0;

  for (const col of columns) {
    if (col && col.crossReferenceTable && col.lookupColumn && col.joinedColumn) {
      const fragment = buildJoinFragment({ tableName, crossTable: col.crossReferenceTable, lookupColumnRaw: col.lookupColumn, joinedColumn: col.joinedColumn, aliasIndex: ++aliasCounter });
      if (fragment.joinSql) joinClauses.push(fragment.joinSql);
      selectParts.push(fragment.select);
    } else if (col && col.name) {
      selectParts.push(`\`${tableName}\`.\`${col.name}\` AS \`${col.name}\``);
    }
  }

  return { joinSql: joinClauses.join(' '), selectParts };
}

module.exports = { buildJoinsForColumns };

Notes on the example

- Small pure functions with guard clauses make unit testing straightforward.
- The join builder returns SQL fragments and selectParts that the `queryBuilder` can compose into a final parameterized query.
- Errors are thrown with a code so the route layer can map them to an appropriate HTTP response.
