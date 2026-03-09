/**
 * Centralized table metadata for the data management domain.
 *
 * Contains display metadata (columns visible to the client, cross-reference
 * hints for joins) and editable-table metadata (primary keys and allowed
 * columns for DML operations).
 *
 * This module is the single source of truth – route handlers import from here
 * instead of defining table structures inline.
 */

// ---------------------------------------------------------------------------
// Display metadata – used by the client to render table grids and by the
// query builder to construct SELECT / JOIN clauses.
// ---------------------------------------------------------------------------

const tableDisplayMetadata = {
  mapButtons: {
    displayName: 'Programs',
    columns: [
      { name: 'part_name', label: 'Program Name', visible: true },
      { name: 'button_category', label: 'Category', visible: true },
      { name: 'button_link', label: 'Website', visible: true },
      { name: 'button_text', visible: false },
      { name: 'image', visible: false },
      { name: 'marker_colors_by', visible: false },
      { name: 'marker_colors', visible: false },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditProgramModal' },
    ],
  },
  locations: {
    displayName: 'Locations',
    columns: [
      { name: 'id', visible: false },
      { name: 'inst_address', visible: false },
      { name: 'lat', visible: false },
      { name: 'lng', visible: false },
      { name: 'inst_title', label: 'Location Name', visible: true },
      { name: 'country', label: 'Country', visible: true },
      { name: 'scale', label: 'Scale', visible: true },
      { name: 'population', label: 'Population', visible: true },
      { name: 'density_km2', visible: false },
      { name: 'area_km2', label: 'Area (km²)', visible: true },
      { name: 'area_ha', label: 'Area (ha)', visible: false },
      { name: 'biodiversity_url', visible: false },
      { name: 'url_verifydate', label: 'Url verified on', visible: false },
      { name: 'wwf_biome', label: 'WWF Biome', visible: false },
      { name: 'wwf_terrestrial_ecoregion', label: 'WWF Terrestrial Ecoregion', visible: false },
      { name: 'hotspot', label: 'Hotspot', visible: false },
      { name: 'conservation_status_wwf', label: 'Conservation Status WWF', visible: false },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditLocationModal' },
    ],
  },
  documents: {
    displayName: 'Documents',
    columns: [
      { name: 'id', visible: false },
      { name: 'inst_id', visible: false },
      { crossReferenceTable: 'locations', lookupColumn: 'inst_id', joinedColumn: 'inst_title', label: 'Institution Title', visible: true },
      { name: 'doc_type', label: 'Document Type', visible: true },
      { name: 'doc_year', label: 'Year', visible: true },
      { name: 'doc_title', label: 'Title', visible: true },
      { name: 'doc_url', label: 'Document URL', visible: true },
      { name: 'keywords', label: 'Keywords', visible: false },
      { name: 'source_url', label: 'Source URL', visible: false },
      { name: 'link_verified', label: 'Link Verified', visible: false },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditDocumentModal' },
    ],
  },
  participation: {
    displayName: 'Participations in Programs',
    columns: [
      { name: 'id', visible: false },
      { name: 'inst_id', visible: false },
      { crossReferenceTable: 'locations', lookupColumn: 'inst_id', joinedColumn: 'inst_title', label: 'Institution Title', visible: true },
      { name: 'part_name', label: 'Program Name', visible: true },
      { name: 'part_category', label: 'Category', visible: true },
      { name: 'part_year', label: 'Year', visible: true },
      { name: 'part_data', label: 'Data', visible: false },
      { name: 'part_units', label: 'Units', visible: false },
      { name: 'part_level', label: 'Level', visible: false },
      { name: 'part_link_label', label: 'Link Label 1', visible: false },
      { name: 'part_link', label: 'Link 1', visible: false },
      { name: 'part_link_label2', label: 'Link Label 2', visible: false },
      { name: 'part_link2', label: 'Link 2', visible: false },
      { name: 'part_link_label3', label: 'Link Label 3', visible: false },
      { name: 'part_link3', label: 'Link 3', visible: false },
      { name: 'keywords', label: 'Keywords', visible: false },
      { name: 'link_verified', label: 'Link Verified', visible: false },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditProgramParticipationModal' },
    ],
  },
  row_versions: {
    displayName: 'Submissions',
    columns: [
      { name: 'id', visible: false },
      { crossReferenceTable: 'locations', lookupColumn: 'json:$.inst_id|json:$.inst_title', joinedColumn: 'inst_title', label: 'Institution Title', visible: true },
      { name: 'table_name', label: 'Table Name', visible: true },
      { name: 'row_key', label: 'Row ID', visible: false },
      { name: 'operation', label: 'Operation', visible: true },
      { name: 'status', label: 'Status', visible: true, renderFunction: 'submissionStatusRenderer' },
      { name: 'version', label: 'Version', visible: false },
      { name: 'data', label: 'Data', visible: true },
      { name: 'created_by', label: 'Submitted By', visible: true },
      { name: 'created_at', label: 'Submitted At', visible: true },
      { name: 'approved_by', label: 'Reviewed By', visible: true },
      { name: 'approved_at', label: 'Reviewed At', visible: true, type: 'date' },
      { name: 'notes', label: 'Review Comments', visible: true },
      { button: 'review', label: 'Review', visible: true, onClickFunction: 'openReviewModal' },
    ],
  },
  users: {
    displayName: 'Users',
    columns: [
      { name: 'alias', label: 'Name', visible: true, renderFunction: 'nameRenderer' },
      { name: 'privileges', label: 'Role', visible: true, renderFunction: 'privilegeRenderer' },
      { name: 'status', label: 'Status', visible: true, renderFunction: 'statusRenderer' },
      { name: 'region', label: 'Region', visible: true },
      { name: 'assignedSite', label: 'Assigned Sites', visible: true, renderFunction: 'assignRenderer' },
      { name: 'lastActive', label: 'Last Active', visible: true, renderFunction: 'lastActiveRenderer' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Executive-only additional columns appended to the users table at runtime.
// ---------------------------------------------------------------------------

const executiveUserColumns = [
  { name: 'email', label: 'Email', visible: true },
  { name: 'userAddress', label: 'Address', visible: false },
  { name: 'title', label: 'Title', visible: true },
  { name: 'institution', label: 'Institution', visible: true },
  { name: 'whatsAppNumber', label: 'WhatsApp Number', visible: true },
  { name: 'primaryContact', label: 'Primary Contact', visible: true },
  { name: 'notes', label: 'Notes', visible: false },
  { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditUserModal' },
];

// ---------------------------------------------------------------------------
// Editable-table metadata – primary keys and allowed DML columns.
// ---------------------------------------------------------------------------

const editableTableMetadata = {
  mapButtons: {
    primaryKey: ['part_name'],
    columns: ['part_name', 'button_category', 'button_text', 'image', 'marker_colors_by', 'marker_colors', 'button_link'],
  },
  locations: {
    primaryKey: ['id'],
    columns: ['id', 'inst_address', 'lat', 'lng', 'inst_title', 'country', 'scale', 'population', 'density_km2', 'area_km2', 'area_ha', 'biodiversity_url', 'url_verifydate', 'wwf_biome', 'wwf_terrestrial_ecoregion', 'hotspot', 'conservation_status_wwf'],
  },
  documents: {
    primaryKey: ['id'],
    columns: ['id', 'inst_id', 'doc_type', 'doc_year', 'doc_title', 'doc_url', 'keywords', 'source_url', 'link_verified'],
  },
  participation: {
    primaryKey: ['id'],
    columns: ['id', 'inst_id', 'part_category', 'part_name', 'part_year', 'part_data', 'part_units', 'part_level', 'part_link_label', 'part_link', 'part_link_label2', 'part_link2', 'part_link_label3', 'part_link3', 'keywords', 'link_verified'],
  },
};

// ---------------------------------------------------------------------------
// Navigation menu candidates.
// ---------------------------------------------------------------------------

const navigationMenuCandidates = [
  { tableKey: 'mapButtons', icon: '/icons/programIcon.svg', label: 'Programs' },
  { tableKey: 'locations', icon: '/icons/institutionIcon.svg', label: 'Locations' },
  { tableKey: 'documents', icon: '/icons/documentIcon.svg', label: 'Documents' },
  { tableKey: 'participation', icon: '/icons/participationIcon.svg', label: 'Participations' },
  { tableKey: 'row_versions', icon: '/icons/submissionIcon.svg', label: 'Submissions' },
  { tableKey: 'users', icon: '/icons/usersIcon.svg', label: 'Users' },
  { onClick: 'openMyProfileModal', icon: '/icons/profileIcon.svg', label: 'My Profile' },
  { tableKey: 'row_versions', icon: '/icons/approveIcon.svg', label: 'Approvals' },
  { tableKey: 'users', icon: '/icons/usersIcon.svg', label: 'Manage Users' },
  { onClick: 'openMap', icon: '/icons/mapIcon.svg', label: 'Map' },
  { onClick: '', icon: '/icons/resourcesIcon.svg', label: 'Resources' },
  { onClick: '', icon: '/icons/resourcesIcon.svg', label: 'UBHubber Resources' },
];

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Return the full display metadata object for a given table name.
 *
 * @param {string} tableName
 * @returns {object} The table display metadata.
 * @throws {Error} with code 'UNKNOWN_TABLE' when the table is not recognised.
 */
export function getTableDisplayMetadata(tableName) {
  const metadata = tableDisplayMetadata[tableName];
  if (!metadata) {
    const error = new Error(`Unknown table: ${tableName}`);
    error.code = 'UNKNOWN_TABLE';
    throw error;
  }
  return metadata;
}

/**
 * Return the server-side original metadata object (with raw cross-reference
 * definitions) for a table. This is used by the query builder for SQL
 * generation and is never sent to the client.
 *
 * Identical to getTableDisplayMetadata today but kept as a separate accessor
 * so that the two can diverge without breaking callers.
 *
 * @param {string} tableName
 * @returns {object}
 */
export function getServerTableMetadata(tableName) {
  return getTableDisplayMetadata(tableName);
}

/**
 * Return all table display metadata keys.
 *
 * @returns {string[]}
 */
export function listAvailableTables() {
  return Object.keys(tableDisplayMetadata);
}

/**
 * Return the editable-table metadata (primary key and allowed columns) for a
 * table, or undefined if the table is not editable.
 *
 * @param {string} tableName
 * @returns {object|undefined}
 */
export function getEditableTableMetadata(tableName) {
  return editableTableMetadata[tableName];
}

/**
 * Assert that a table is editable. Throws a domain error if not.
 *
 * @param {string} tableName
 * @throws {Error} with code 'INVALID_TABLE'.
 */
export function assertTableAllowed(tableName) {
  if (!editableTableMetadata[tableName]) {
    const error = new Error('Invalid table name');
    error.code = 'INVALID_TABLE';
    throw error;
  }
}

/**
 * Create a shallow deep-clone of a table definition and normalize
 * cross-reference columns so that the client always sees a `name` property.
 *
 * @param {object} tableDefinition
 * @returns {object} A cloned, client-safe table definition.
 */
export function transformTableForClient(tableDefinition) {
  if (!tableDefinition) {
    return tableDefinition;
  }

  const clone = JSON.parse(JSON.stringify(tableDefinition));

  if (Array.isArray(clone.columns)) {
    clone.columns = clone.columns.map(column => {
      if (column && column.crossReferenceTable && column.joinedColumn && !column.name) {
        return Object.assign({}, column, { name: column.joinedColumn });
      }
      return column;
    });
  }

  return clone;
}

/**
 * Build the set of table definitions visible to a user based on their
 * privilege level.
 *
 * @param {object} request - Express request with session info.
 * @returns {object} A map of tableKey → client-safe table definition.
 */
export function getTablesForUser(request) {
  const tablesForUser = {};

  if (request.session.user && request.session.privileges >= 2) {
    tablesForUser.locations = transformTableForClient(tableDisplayMetadata.locations);
    tablesForUser.documents = transformTableForClient(tableDisplayMetadata.documents);
    tablesForUser.participation = transformTableForClient(tableDisplayMetadata.participation);
    tablesForUser.mapButtons = transformTableForClient(tableDisplayMetadata.mapButtons);
    tablesForUser.row_versions = transformTableForClient(tableDisplayMetadata.row_versions);
  }

  if (request.session.user && request.session.privileges >= 3) {
    tablesForUser.users = transformTableForClient(tableDisplayMetadata.users);
  }

  if (request.session.user && request.session.privileges >= 4) {
    for (const column of executiveUserColumns) {
      tablesForUser.users.columns.push(column);
    }
  }

  return tablesForUser;
}

/**
 * Build the navigation menu for a user based on their privilege level.
 *
 * @param {object} request - Express request with session info.
 * @returns {Array<object>}
 */
export function getNavigationMenuForUser(request) {
  const navigationMenu = [];

  navigationMenu.push(navigationMenuCandidates[9]); // Map

  if (request.session.user && request.session.privileges >= 2) {
    navigationMenu.push(navigationMenuCandidates[0]); // Programs
    navigationMenu.push(navigationMenuCandidates[1]); // Institutions
    navigationMenu.push(navigationMenuCandidates[2]); // Documents
    navigationMenu.push(navigationMenuCandidates[3]); // Participations
    navigationMenu.push(navigationMenuCandidates[4]); // Submissions
  }

  if (request.session.user && request.session.privileges >= 3) {
    navigationMenu.push(navigationMenuCandidates[5]); // Users
  }

  if (request.session.user) {
    navigationMenu.push(navigationMenuCandidates[6]); // My Profile
    navigationMenu.push(navigationMenuCandidates[11]); // UBHubber Resources
  }

  navigationMenu.push(navigationMenuCandidates[10]); // Resources

  if (request.session.user && request.session.privileges >= 3) {
    navigationMenu.push(navigationMenuCandidates[7]); // Approvals
  }

  if (request.session.user && request.session.privileges >= 4) {
    navigationMenu.push(navigationMenuCandidates[8]); // Manage Users
  }

  return navigationMenu;
}

