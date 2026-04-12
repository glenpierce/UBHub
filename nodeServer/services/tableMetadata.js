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
      { name: 'part_name', label: 'Program Name', visible: true, placeholder: 'Enter the program name (e.g. Community River Cleanup)' },
      { name: 'button_category', label: 'Category', visible: true, placeholder: 'Category or type of program (e.g. Education, Restoration)' },
      { name: 'button_link', label: 'Website', visible: true, placeholder: 'Full URL to program page (https://...)' },
      { name: 'button_text', visible: false, placeholder: '' },
      { name: 'image', visible: false, placeholder: '' },
      { name: 'marker_colors_by', visible: false, placeholder: '' },
      { name: 'marker_colors', visible: false, placeholder: '' },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditProgramModal' },
    ],
  },
  locations: {
    displayName: 'Locations',
    columns: [
      { name: 'id', visible: false, placeholder: '' },
      { name: 'inst_address', visible: false, placeholder: 'Street address or descriptive address for the location' },
      { name: 'lat', visible: false, placeholder: 'Latitude in decimal degrees (e.g. -1.2921)' },
      { name: 'lng', visible: false, placeholder: 'Longitude in decimal degrees (e.g. 36.8219)' },
      { name: 'inst_title', label: 'Location Name', visible: true, placeholder: 'Full name of the location (e.g. Lake Nakuru National Park)' },
      { name: 'country', label: 'Country', visible: true, placeholder: 'Country name (e.g. Kenya)' },
      { name: 'scale', label: 'Scale', visible: true, placeholder: 'Scale of the site (e.g. Local, Regional, National)' },
      { name: 'population', label: 'Population', visible: true, placeholder: 'Population estimate (numeric)' },
      { name: 'density_km2', visible: false, placeholder: '' },
      { name: 'area_km2', label: 'Area (km²)', visible: true, placeholder: 'Area in square kilometers (numeric)' },
      { name: 'area_ha', label: 'Area (ha)', visible: false, placeholder: '' },
      { name: 'biodiversity_url', visible: false, placeholder: 'Link to biodiversity information for the site' },
      { name: 'url_verifydate', label: 'Url verified on', visible: false, placeholder: 'Date the URL was verified (YYYY-MM-DD)' },
      { name: 'wwf_biome', label: 'WWF Biome', visible: false, placeholder: 'WWF biome name if known' },
      { name: 'wwf_terrestrial_ecoregion', label: 'WWF Terrestrial Ecoregion', visible: false, placeholder: 'WWF ecoregion name if known' },
      { name: 'hotspot', label: 'Hotspot', visible: false, placeholder: 'Is this a biodiversity hotspot? (yes/no)' },
      { name: 'conservation_status_wwf', label: 'Conservation Status WWF', visible: false, placeholder: 'Conservation status per WWF classification' },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditLocationModal' },
    ],
  },
  documents: {
    displayName: 'Documents',
    columns: [
      { name: 'id', visible: false, placeholder: '' },
      { name: 'inst_id', visible: false, placeholder: '' },
      { crossReferenceTable: 'locations', lookupColumn: 'inst_id', joinedColumn: 'inst_title', label: 'Institution Title', visible: true, placeholder: 'Choose or search for the institution this document belongs to' },
      { name: 'doc_type', label: 'Document Type', visible: true, placeholder: 'Type of document (e.g. Report, Article, Dataset)' },
      { name: 'doc_year', label: 'Year', visible: true, placeholder: 'Year of publication (YYYY)' },
      { name: 'doc_title', label: 'Title', visible: true, placeholder: 'Title of the document' },
      { name: 'doc_url', label: 'Document URL', visible: true, placeholder: 'Full URL to the document or leave blank if uploading a PDF' },
      { name: 'keywords', label: 'Keywords', visible: false, placeholder: 'Comma-separated keywords to aid searching' },
      { name: 'source_url', label: 'Source URL', visible: false, placeholder: 'Original source URL if different' },
      { name: 'link_verified', label: 'Link Verified', visible: false, placeholder: 'Has the link been verified? (yes/no)' },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditDocumentModal' },
    ],
  },
  participation: {
    displayName: 'Participations in Programs',
    columns: [
      { name: 'id', visible: false, placeholder: '' },
      { name: 'inst_id', visible: false, placeholder: '' },
      { crossReferenceTable: 'locations', lookupColumn: 'inst_id', joinedColumn: 'inst_title', label: 'Institution Title', visible: true, placeholder: 'Choose the associated institution' },
      { name: 'part_name', label: 'Program Name', visible: true, placeholder: 'Name of the program' },
      { name: 'part_category', label: 'Category', visible: true, placeholder: 'Program category (e.g. Education, Research)' },
      { name: 'part_year', label: 'Year', visible: true, placeholder: 'Year of participation (YYYY)' },
      { name: 'part_data', label: 'Data', visible: false, placeholder: 'Numeric or textual data relevant to participation' },
      { name: 'part_units', label: 'Units', visible: false, placeholder: 'Units for the data (e.g. hectares, people)' },
      { name: 'part_level', label: 'Level', visible: false, placeholder: 'Level of participation (e.g. Local, National)' },
      { name: 'part_link_label', label: 'Link Label 1', visible: false, placeholder: 'Label for link 1' },
      { name: 'part_link', label: 'Link 1', visible: false, placeholder: 'URL for link 1' },
      { name: 'part_link_label2', label: 'Link Label 2', visible: false, placeholder: 'Label for link 2' },
      { name: 'part_link2', label: 'Link 2', visible: false, placeholder: 'URL for link 2' },
      { name: 'part_link_label3', label: 'Link Label 3', visible: false, placeholder: 'Label for link 3' },
      { name: 'part_link3', label: 'Link 3', visible: false, placeholder: 'URL for link 3' },
      { name: 'keywords', label: 'Keywords', visible: false, placeholder: 'Comma-separated keywords' },
      { name: 'link_verified', label: 'Link Verified', visible: false, placeholder: 'Has the link been verified? (yes/no)' },
      { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditProgramParticipationModal' },
    ],
  },
  row_versions: {
    displayName: 'Submissions',
    columns: [
      { name: 'id', visible: false, placeholder: '' },
      { crossReferenceTable: 'locations', lookupColumn: 'json:$.inst_id|json:$.inst_title', joinedColumn: 'inst_title', label: 'Institution Title', visible: true, placeholder: 'Related institution name' },
      { name: 'table_name', label: 'Table Name', visible: true, placeholder: 'Name of the table the submission targets' },
      { name: 'row_key', label: 'Row ID', visible: false, placeholder: '' },
      { name: 'operation', label: 'Operation', visible: true, placeholder: 'Operation type (insert, update, delete)' },
      { name: 'status', label: 'Status', visible: true, renderFunction: 'submissionStatusRenderer', placeholder: '' },
      { name: 'version', label: 'Version', visible: false, placeholder: '' },
      { name: 'data', label: 'Data', visible: true, placeholder: 'JSON representation of pending data' },
      { name: 'created_by', label: 'Submitted By', visible: true, placeholder: 'User who submitted the change' },
      { name: 'created_at', label: 'Submitted At', visible: true, placeholder: 'Timestamp of submission' },
      { name: 'approved_by', label: 'Reviewed By', visible: true, placeholder: 'Approver username' },
      { name: 'approved_at', label: 'Reviewed At', visible: true, type: 'date', placeholder: 'Approval timestamp' },
      { name: 'notes', label: 'Review Comments', visible: true, placeholder: 'Reviewer comments or rationale' },
      { button: 'review', label: 'Review', visible: true, onClickFunction: 'openReviewModal' },
    ],
  },
  users: {
    displayName: 'Users',
    columns: [
      { name: 'alias', label: 'Name', visible: true, renderFunction: 'nameRenderer', placeholder: 'Full name or display name' },
      { name: 'privileges', label: 'Role', visible: true, renderFunction: 'privilegeRenderer', placeholder: 'User privilege level (e.g. contributor, approver)' },
      { name: 'status', label: 'Status', visible: true, renderFunction: 'statusRenderer', placeholder: 'Account status (active/inactive)' },
      { name: 'region', label: 'Region', visible: true, placeholder: 'Geographic region assigned to the user' },
      { name: 'assignedSite', label: 'Assigned Sites', visible: true, renderFunction: 'assignRenderer', placeholder: 'Sites assigned to this user' },
      { name: 'lastActive', label: 'Last Active', visible: true, renderFunction: 'lastActiveRenderer', placeholder: 'Timestamp of last activity' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Executive-only additional columns appended to the users table at runtime.
// ---------------------------------------------------------------------------

const executiveUserColumns = [
  { name: 'email', label: 'Email', visible: true, placeholder: 'User email address' },
  { name: 'userAddress', label: 'Address', visible: false, placeholder: 'Postal or street address' },
  { name: 'title', label: 'Title', visible: true, placeholder: 'Job title or honorific' },
  { name: 'institution', label: 'Institution', visible: true, placeholder: 'User institution or affiliation' },
  { name: 'whatsAppNumber', label: 'WhatsApp Number', visible: true, placeholder: 'Contact phone number including country code' },
  { name: 'primaryContact', label: 'Primary Contact', visible: true, placeholder: 'Primary contact person or email' },
  { name: 'notes', label: 'Notes', visible: false, placeholder: 'Free-form notes about the user' },
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
const NAV_MENU_INDEX = {
  PROGRAMS: 0,
  INSTITUTIONS: 1,
  DOCUMENTS: 2,
  PARTICIPATIONS: 3,
  SUBMISSIONS: 4,
  USERS: 5,
  MY_PROFILE: 6,
  APPROVALS: 7,
  MANAGE_USERS: 8,
  MAP: 9,
  RESOURCES: 10,
  UBHUBBER_RESOURCES: 11,
};

export function getNavigationMenuForUser(request) {
  const navigationMenu = [];

  navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.MAP]); // Map

  if (request.session.user && request.session.privileges >= 2) {
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.PROGRAMS]); // Programs
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.INSTITUTIONS]); // Institutions
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.DOCUMENTS]); // Documents
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.PARTICIPATIONS]); // Participations
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.SUBMISSIONS]); // Submissions
  }

  if (request.session.user && request.session.privileges >= 3) {
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.USERS]); // Users
  }

  if (request.session.user) {
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.MY_PROFILE]); // My Profile
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.UBHUBBER_RESOURCES]); // UBHubber Resources
  }

  navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.RESOURCES]); // Resources

  if (request.session.user && request.session.privileges >= 3) {
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.APPROVALS]); // Approvals
  }

  if (request.session.user && request.session.privileges >= 4) {
    navigationMenu.push(navigationMenuCandidates[NAV_MENU_INDEX.MANAGE_USERS]); // Manage Users
  }

  return navigationMenu;
}

