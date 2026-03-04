# Make Locations.inst_title discoverable in Documents and Participation forms

Purpose

This document describes a small, safe improvement to the data management workflows: show and search for the human-friendly location name (`inst_title` in the `locations` table) when users add or edit rows in the `documents` and `participation` tables instead of forcing them to type `inst_id` directly. The goal is to make the interface simpler and less error prone while preserving existing server-side data integrity.

High-level plan (actions)

- Reuse the existing `GET /location-search` endpoint for typeahead lookups.
- Update the client-side data management forms for `documents` and `participation` to provide a typeahead / autocomplete field that searches by `inst_title` and stores the selected location `id` as the actual `inst_id` to send to the server.
- Ensure server-side endpoints continue to accept `inst_id` (unchanged). Perform validation and sanitization server-side when processing pending changes and approvals.
- Add automated tests covering the client typeahead behavior (unit / integration) and server-side validation (unit).
- Roll out behind feature-flag or disabled by default if preferred; otherwise release with backwards compatibility preserved.

Checklist

- [ ] Create a simple, documented UI typeahead component (client) that calls `GET /location-search`.
- [ ] Replace or augment the `inst_id` input in the `documents` and `participation` forms with the typeahead component.
- [ ] Ensure the form sends `inst_id` (numeric) to existing endpoints (no server API changes required).
- [ ] Add server-side validation tests to confirm submitted `inst_id` corresponds to an existing `locations.id`.
- [ ] Add client-side tests for the typeahead and for form submission mapping to `inst_id`.
- [ ] Update documentation and `plans/plan.md` (this file) and add rollout notes.

Contract (inputs / outputs / success criteria)

- Inputs: A typed query string entered by the user in the location field when adding or editing a Document or a Participation entry.
- Outputs: A selectable list of up to 50 location suggestions (objects with at least `id` and `inst_title`). When the user selects one suggestion, the form stores the matching `id` in the `inst_id` field that is submitted to the existing pending-change endpoint.
- Error modes: If no suggestions found, show `No matches`. If the user manually types but does not select a suggestion, the form must either clear the `inst_id` (and prevent submit if `inst_id` is required) or validate on submit by resolving the typed name to an id; the chosen approach is to require an explicit selection to prevent ambiguity.
- Success criteria: Users can search by institution name and select a location; server receives numeric `inst_id` exactly as before; tests pass.

Design details

1. Server-side

- No new database schema changes required.
- Reuse the existing endpoint `GET /location-search` defined in `nodeServer/routes/dataManagement.js`. This endpoint already returns `id` and `inst_title` when queried as `?query=...`.
- Add server-side validation tests: when processing pending changes (e.g., in `createPendingChange` and `approveVersion` flows) ensure that when `tableName` is `documents` or `participation` and `inst_id` is present, the application confirms the referenced `inst_id` exists in `locations` (SELECT 1 FROM locations WHERE id = ?). This validation prevents dangling foreign keys if the database has no enforced FK constraint.

2. Client-side

- Files to change (existing codebase):
  - `nodeServer/views/dataManagement.pug` (form field markup may be adjusted or given an id/class for the typeahead to attach to). Minimal changes only: ensure the form field for `inst_id` can be targeted via a stable attribute such as `data-field="inst_id"` or an id like `instIdField` inside the relevant modal templates.
  - `public/javascripts/data-management/` (or `public/javascripts` equivalent) - add or update a small `typeahead.js` or `locationTypeahead.js` module and integrate it into `dataManagementInitialization.js`.

- Behavior for the typeahead component:
  - Debounce keystrokes (200ms-300ms) before issuing a fetch to `/location-search?query=<encoded>`.
  - Show up to 50 suggestions (the server limits to 50 already). Display suggestions as `inst_title` and optionally `country` or `id` in muted text if available.
  - When a user selects a suggestion, set a hidden input field named `inst_id` to the selected numeric id and display the chosen `inst_title` as the visible value.
  - Prevent form submission unless the hidden `inst_id` is set. If the user clears the visible field, clear the hidden `inst_id` as well.
  - If the user pastes an existing numeric id into the legacy `inst_id` field, allow it but attempt to autocomplete the name by fetching `locations` by id; if not found, show validation error.

- Accessibility
  - Ensure the typeahead uses ARIA attributes for role="listbox" and role="option" and supports keyboard navigation (arrow keys + Enter + Esc) and screen readers.

- Progressive enhancement and backward compatibility
  - Keep a fallback plain text / numeric input for `inst_id` that is used if JavaScript is disabled. The typeahead replaces the visible input but the form still includes the hidden `inst_id` field that is sent to the server.

Validation rules and edge cases

- Edge case: Two locations with identical `inst_title`. The component stores and submits the selected `id` and also displays the `inst_title`. The UI should show additional context (country) to help distinguish duplicates. Server side operates only on `id` so correctness is preserved.
- Edge case: User types a name but does not pick a suggestion. We will require explicit selection before allowing the submit. This avoids ambiguity. Provide clear inline validation message like "Please select a location from the suggestions." Alternatively, a future enhancement could attempt to resolve typed text on submit.
- Edge case: Network or server error during suggestion fetch. Show a non-blocking message like "Unable to fetch locations" and allow the user to enter numeric `inst_id` manually.
- Edge case: Permissions. The `GET /location-search` endpoint is already guarded by `isAuthenticated` and `isContributor`. Confirm the existing protections meet requirements.

Server-side validation tests

- Add tests under `nodeServer/test/` (example `locationValidation.test.js`) that:
  - Call internal validation helper (new helper function `validateLocationExists(pool, instId)`) with valid and invalid ids and assert expected results.
  - Simulate approving a pending change that references a non-existent `inst_id` and assert the system rejects approval with a clear error message.

Client tests

- Add unit tests for the typeahead UI component. If the project uses a test runner already present in `nodeServer/vitest.config.js` and existing tests in `nodeServer/test/`, add tests consistent with that setup.
- Test cases:
  - Typing triggers debounced fetch and shows suggestions.
  - Selecting a suggestion populates hidden `inst_id` and visible label.
  - Clearing the visible label clears hidden `inst_id` and disables submit.
  - Keyboard navigation works (arrow keys + enter + escape).

Acceptance criteria

- Manual QA: On the data management page when adding a Document or Participation entry, typing into the Location field shows suggestions by `inst_title`. Selecting a suggestion sets the correct `inst_id`. The submitted pending change includes the numeric `inst_id` identical to selecting `inst_id` manually.
- Automated tests: Server-side validation tests and client-side component tests pass in CI.
- No breaking changes: Existing API behavior for other tables and flows remains unchanged.

Implementation steps (concrete change list)

1. Add a stable target in the Pug templates for the location field.
   - File: `nodeServer/views/dataManagement.pug`
   - Change: assign `data-field="inst_id"` and an id for the visible field, e.g. `id="locationNameInput"`, plus a hidden input `name="inst_id" id="instIdHidden"`.

2. Add a small client module `public/javascripts/data-management/locationTypeahead.js`.
   - Expose an initialization function `initializeLocationTypeahead({visibleInputSelector, hiddenInputSelector, searchUrl})`.
   - Implement debouncing, fetch suggestions from `/location-search`, keyboard navigation and selection behavior, ARIA attributes, and clear/validation behaviors.

3. Wire the typeahead into the data management initialization.
   - File: `public/javascripts/data-management/dataManagementInitialization.js` (or whichever central startup module exists).
   - Call `initializeLocationTypeahead` when the document or modal showing the Document or Participation form is created.

4. Update client form submit logic.
   - Ensure the JSON sent for pending-change includes the `inst_id` numeric value in the `data` object. If the frontend serializes form fields automatically, ensure the hidden `inst_id` input is included.
   - If the frontend currently expects `inst_id` as a top-level field name in some other shape, adapt mapping code in the submit flow to include `inst_id` in the `data` object for `documents` and `participation` table submissions.

5. Server-side hardening.
   - Add helper `validateLocationExists` and call it in the `createPendingChange` or approval flow (as appropriate) to reject requests that reference a non-existent `inst_id` early with a 400 error.
   - File: `nodeServer/routes/dataManagement.js` (add helper and tests).

6. Tests and documentation.
   - Add tests in `nodeServer/test/` for server validation and client unit tests for the typeahead.
   - Update README or `README.LOCAL.md` to note the presence of the typeahead and any environment requirements.

Rollout and backward compatibility

- Because the backend contract remains unchanged (the server still accepts `inst_id` numeric values), rollout can be done in a single release.
- Keep the numeric fallback input visible or accessible as a progressive enhancement so that users without JavaScript can still provide `inst_id` manually.
- If desired, enable a runtime feature flag such as `process.env.FEATURE_LOCATION_TYPEAHEAD` and gate the front-end initialisation to that flag for controlled rollout.

Estimate and effort

- Developer tasks: 1-2 days
  - Client typeahead component: 6-12 hours (including accessibility and tests)
  - Template changes and wiring: 1-2 hours
  - Server-side validation helper and tests: 2-4 hours
  - QA and documentation: 2-4 hours

Quality gates

- Build and Lint: Run project's lint and build steps.
- Unit tests: Run server tests and client unit tests.
- Manual smoke: Create a new Document and Participation entry, verify the typeahead works and the server receives the correct `inst_id`.

Next steps

- If you want, I can implement the smallest server-side safety net first (a `validateLocationExists` helper and tests) as a low-risk change.
- Or I can implement the client typeahead component and wire it to the forms, including tests.

Files to edit or add (summary)

- Edit: `nodeServer/views/dataManagement.pug` (add stable attributes for the location input and hidden inst_id field)
- Edit: `nodeServer/routes/dataManagement.js` (add server-side validation helper and call sites)
- Add: `public/javascripts/data-management/locationTypeahead.js` (client component)
- Edit: `public/javascripts/data-management/dataManagementInitialization.js` (initialize typeahead)
- Add tests: `nodeServer/test/locationValidation.test.js`, `nodeServer/test/locationTypeahead.test.js`

If you want me to proceed and implement any of the concrete code changes or tests, tell me which item to start with and I will execute it and run the tests.

