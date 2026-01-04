import express from 'express';
const router = express.Router();
import { pool, makeDbCallAsPromise } from '../ConnectionPool.js';

router.get('/', function(req, res) {
  const dataManagementConfig = {
    tablesForUser: getTablesForUser(req),
    navMenu: getNavMenuForUser(req),
    user: req.user,
  }
  res.render('dataManagement', {dataManagementConfig: JSON.stringify(dataManagementConfig)});
});

function getTablesForUser(req) {
  const tablesForUser = {};
  if (req.session.user && req.session.privileges >= 2) {
    tablesForUser.locations = tables.locations;
    tablesForUser.documents = tables.documents;
    tablesForUser.participation = tables.participation;
    tablesForUser.mapButtons = tables.mapButtons;
    tablesForUser.row_versions = tables.row_versions;
  }
  if (req.session.user && req.session.privileges >= 3) {
    tablesForUser.users = tables.users;
  }
  if (req.session.user && req.session.privileges >= 4) {
    addExecutiveFunctions(tablesForUser);
  }
  return tablesForUser;
}

const tables = {
  mapButtons: {
    displayName: 'Programs',
    columns: [
      {name: 'part_name', label: 'Program Name', visible: true},
      {name: 'button_category', label: 'Category', visible: true},
      {name: 'button_link', label: 'Website', visible: true},
      {name: 'button_text', visible: false},
      {name: 'image', visible: false},
      {name: 'marker_colors_by', visible: false},
      {name: 'marker_colors', visible: false}
    ]
  },
  locations: {
    displayName: 'Locations',
    columns: [
      {name: 'id', visible: false},
      {name: 'inst_address', visible: false},
      {name: 'lat', visible: false},
      {name: 'lng', visible: false},
      {name: 'inst_title', label: 'Location Name', visible: true},
      {name: 'country', label: 'Country', visible: true},
      {name: 'scale', label: 'Scale', visible: true},
      {name: 'population', label: 'Population', visible: true},
      {name: 'density_km2', visible: false},
      {name: 'area_km2', label: 'Area (km²)', visible: true},
      {name: 'area_ha', label: 'Area (ha)', visible: false},
      {name: 'biodiversity_url', visible: false},
      {name: 'url_verifydate', label: 'Url verified on', visible: false},
      {name: 'wwf_biome', label: 'WWF Biome', visible: false},
      {name: 'wwf_terrestrial_ecoregion', label: 'WWF Terrestrial Ecoregion', visible: false},
      {name: 'hotspot', label: 'Hotspot', visible: false},
      {name: 'conservation_status_wwf', label: 'Conservation Status WWF', visible: false}
    ]
  },
  documents: {
    displayName: 'Documents',
    columns: [
      {name: 'id', visible: false},
      {name: 'inst_id', visible: false},
      {name: 'doc_type', label: 'Document Type', visible: true},
      {name: 'doc_year', label: 'Year', visible: true},
      {name: 'doc_title', label: 'Title', visible: true},
      {name: 'doc_url', label: 'Document URL', visible: true},
      {name: 'keywords', label: 'Keywords', visible: false},
      {name: 'source_url', label: 'Source URL', visible: false},
      {name: 'link_verified', label: 'Link Verified', visible: false}
    ]
  },
  participation: {
    displayName: 'Program Participations',
    columns: [
      {name: 'id', visible: false},
      {name: 'inst_id', visible: false},
      {name: 'part_name', label: 'Program Name', visible: true},
      {name: 'part_category', label: 'Category', visible: true},
      {name: 'part_year', label: 'Year', visible: true},
      {name: 'part_data', label: 'Data', visible: false},
      {name: 'part_units', label: 'Units', visible: false},
      {name: 'part_level', label: 'Level', visible: false},
      {name: 'part_link_label', label: 'Link Label 1', visible: false},
      {name: 'part_link', label: 'Link 1', visible: false},
      {name: 'part_link_label2', label: 'Link Label 2', visible: false},
      {name: 'part_link2', label: 'Link 2', visible: false},
      {name: 'part_link_label3', label: 'Link Label 3', visible: false},
      {name: 'part_link3', label: 'Link 3', visible: false},
      {name: 'keywords', label: 'Keywords', visible: false},
      {name: 'link_verified', label: 'Link Verified', visible: false}
    ]
  },
  row_versions: {
    displayName: 'Submissions',
    columns: [
      {name: 'id', visible: false},
      {name: 'table_name', label: 'Table Name', visible: true},
      {name: 'row_key', label: 'Row ID', visible: false},
      {name: 'operation', label: 'Operation', visible: true},
      {name: 'status', label: 'Status', visible: true},
      {name: 'version', label: 'Version', visible: false},
      {name: 'data', label: 'Data', visible: true},
      {name: 'created_by', label: 'Submitted By', visible: true},
      {name: 'created_at', label: 'Submitted At', visible: true},
      {name: 'approved_by', label: 'Reviewed By', visible: true},
      {name: 'approved_at', label: 'Reviewed At', visible: true, type: 'date'},
      {name: 'notes', label: 'Review Comments', visible: true},
      {button: 'review', label: 'Review', visible: true, onClickFunction: 'openReviewModal' }
    ]
  },
  users: {
    displayName: 'Users',
    columns: [
      {name: 'alias', label: 'Name', visible: true, renderFunction: 'nameRenderer'},
      {name: 'privileges', label: 'Role', visible: true, renderFunction: 'privilegeRenderer'},
      {name: 'status', label: 'Status', visible: true, renderFunction: 'statusRenderer'},
      {name: 'assignedSite', label: 'Assigned Sites', visible: true, renderFunction: 'assignRenderer'},
      {name: 'lastActive', label: 'Last Active', visible: true, renderFunction: 'lastActiveRenderer'},
    ]
  }
};

function addExecutiveFunctions(tablesForUser) {
  tablesForUser.users.columns.push({button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditUserModal' });

}

function getNavMenuForUser(req) {
  const navigationMenu = [];
  if (req.session.user && req.session.privileges >= 2) {
    navigationMenu.push(menuCandidates[0]); // Programs
    navigationMenu.push(menuCandidates[1]); // Institutions
    navigationMenu.push(menuCandidates[2]); // Documents
    navigationMenu.push(menuCandidates[3]); // Participations
    navigationMenu.push(menuCandidates[4]); // Submissions
  }

  if (req.session.user && req.session.privileges >= 3) {
    navigationMenu.push(menuCandidates[5]); // Users
  }

  if (req.session.user) {
    navigationMenu.push(menuCandidates[6]); // My Profile
  }

  if (req.session.user && req.session.privileges >= 3) {
    navigationMenu.push(menuCandidates[7]); // Approvals
  }

  if (req.session.user && req.session.privileges >= 4) {
    navigationMenu.push(menuCandidates[8]); // Manage Users
  }

  return navigationMenu;
}

const menuCandidates = [
  {tableKey: 'mapButtons', icon: '/icons/programIcon.svg', label: 'Programs'},
  {tableKey: 'locations', icon: '/icons/institutionIcon.svg', label: 'Institutions'},
  {tableKey: 'documents', icon: '/icons/documentIcon.svg', label: 'Documents'},
  {tableKey: 'participation', icon: '/icons/participationIcon.svg', label: 'Participations'},
  {tableKey: 'row_versions', icon: '/icons/submissionIcon.svg', label: 'Submissions'},
  {tableKey: 'users', icon: '/icons/usersIcon.svg', label: 'Users'},
  {href: '/account', icon: '/icons/profileIcon.svg', label: 'My Profile'},
  {tableKey: 'row_versions', icon: '/icons/approveIcon.svg', label: 'Approvals'},
  {tableKey: 'users', icon: '/icons/usersIcon.svg', label: 'Manage Users'}
];

router.get('/table-data/:tableName', isAuthenticated, isContributor, async (req, res) => {
  try {
    const tableName = req.params.tableName;
    // Validate tableName to prevent SQL injection IMPORTANT!!
    const validTableNames = Object.keys(getTablesForUser(req));

    if (!validTableNames.includes(tableName)) {
      return res.status(400).json({error: 'Invalid table name'});
    }

    const tableMeta = getTablesForUser(req)[tableName];
    if (!tableMeta) {
      return res.status(400).json({error: 'Invalid table name'});
    }
    const columnNames = tableMeta.columns.map(col => col.name).filter(name => name);
    const columnList = columnNames.map(name => `\`${name}\``).join(', ');

    const queryString = `SELECT ${columnList}
                         FROM ${tableName}
                         LIMIT 1000`;

    const result = await makeDbCallAsPromise(queryString);

    res.json(result);
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({error: 'Database error'});
  }
});

router.post('/pending-change', isAuthenticated, isContributor, async (req, res) => {
  try {
    const {tableName, rowKey, operation, data} = req.body;

    // basic validation
    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({error: 'tableName required'});
    }
    if (!['insert', 'update', 'delete'].includes(operation)) {
      return res.status(400).json({error: 'invalid operation'});
    }
    // rowKey should be an object for update/delete; for insert it can be empty
    if (rowKey && typeof rowKey !== 'object') {
      return res.status(400).json({error: 'rowKey must be an object'});
    }
    if (data && typeof data !== 'object') {
      return res.status(400).json({error: 'data must be an object'});
    }

    await createPendingChange(pool, tableName, rowKey || {}, operation, data || {}, req.session.user);

    res.status(201).json({success: true});
  } catch (error) {
    if (error.code === 'INVALID_TABLE') {
      return res.status(400).json({error: 'Invalid table'});
    }
    console.error('Error creating pending change:', error);
    res.status(500).json({error: 'Server error'});
  }
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({error: 'Not authenticated'});
}

function isContributor(req, res, next) {
  if (req.session.user && req.session.privileges >= 2) {
    return next();
  }
  res.status(403).json({error: 'Not authorized'});
}

function isApprover(req, res, next) {
  if (req.session.user && req.session.privileges >= 3) {
    return next();
  }
  res.status(403).json({error: 'Not authorized'});
}

function isExec(req, res, next) {
  if (req.session.user && req.session.privileges >= 4) {
    return next();
  }
  res.status(403).json({error: 'Not authorized'});
}

const editableTables = {
  mapButtons: {
    primaryKey: ['part_name'],
    columns: ['part_name', 'button_category', 'button_text', 'image', 'marker_colors_by', 'marker_colors', 'button_link']
  },
  locations: {
    primaryKey: ['id'],
    columns: ['id', 'inst_address', 'lat', 'lng', 'inst_title', 'country', 'scale', 'population', 'density_km2', 'area_km2', 'area_ha', 'biodiversity_url', 'url_verifydate', 'wwf_biome', 'wwf_terrestrial_ecoregion', 'hotspot', 'conservation_status_wwf']
  },
  documents: {
    primaryKey: ['id'],
    columns: ['id', 'inst_id', 'doc_type', 'doc_year', 'doc_title', 'doc_url', 'keywords', 'source_url', 'link_verified']
  },
  participation: {
    primaryKey: ['id'],
    columns: ['id', 'inst_id', 'part_category', 'part_name', 'part_year', 'part_data', 'part_units', 'part_level', 'part_link_label', 'part_link', 'part_link_label2', 'part_link2', 'part_link_label3', 'part_link3', 'keywords', 'link_verified']
  }
};

function assertTableAllowed(tableName) {
  if (!editableTables[tableName]) {
    const error = new Error('Invalid table name');
    error.code = 'INVALID_TABLE';
    throw error;
  }
}

async function createPendingChange(pool, tableName, rowKeyObj, operation, dataObj, user) {
  console.log("creating pending change");
  assertTableAllowed(tableName);
  console.log("table allowed");
  const pkJson = JSON.stringify(rowKeyObj || {});
  const dataJson = JSON.stringify(dataObj || {});
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT COALESCE(MAX(version),0) + 1 AS next_version FROM row_versions WHERE table_name = ? AND JSON_UNQUOTE(JSON_EXTRACT(row_key, '$')) = ?",
      [tableName, pkJson]
    );
    const nextVersion = (rows[0] && rows[0].next_version) || 1;

    await connection.query(
      'INSERT INTO row_versions (table_name, row_key, operation, data, version, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [tableName, pkJson, operation, dataJson, nextVersion, user]
    );
    await connection.commit();
  } catch (error) {
    console.error('Error creating pending change:', error);
    if (connection) {
      try {
        console.log("rolling back");
        await connection.rollback();
      } catch (error) {
        console.error("Failed to rollback: ", error);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}


router.post('/pending-change/review', isAuthenticated, isApprover, async (req, res) => {
  const {id, decision, comments} = req.body;
  try {
    if (!id || typeof id !== 'number') {
      return res.status(400).json({error: 'Invalid id'});
    }
    if (!['Approve', 'Reject'].includes(decision)) {
      return res.status(400).json({error: 'Invalid decision'});
    }
    if (decision === 'Reject') {
      await rejectVersion(pool, id, req);
      res.status(200).json({Status: 'Rejected'});
    }
    if (decision === 'Approve') {
      await approveVersion(pool, id, req.session.user);
      res.status(200).json({Status: 'Approved'});
    }
    return res.status(400).json({error: 'Invalid decision'});
  } catch (error) {
    console.error('Error reviewing pending change:', error);
    res.status(500).json({error: 'Server error'});
  }
});

async function rejectVersion(pool, id, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // lock the version row
    const [rowVersions] = await connection.query('SELECT * FROM row_versions WHERE id = ? FOR UPDATE', [id]);
    if (!rowVersions[0]) {
      throw new Error('Version not found');
    }
    const rowVersion = rowVersions[0];
    if (rowVersion.status !== 'pending') {
      throw new Error('Version not pending');
    }

    await connection.query('UPDATE row_versions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?', ['rejected', req.session.user, id]);
    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        console.log("rolling back");
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Failed to rollback: ", rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Failed to release connection: ", releaseError);
      }
    }
  }
}

async function approveVersion(pool, versionId, approver) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // lock the version row
    const [rowVersions] = await connection.query('SELECT * FROM row_versions WHERE id = ? FOR UPDATE', [versionId]);
    if (!rowVersions[0]) {
      throw new Error('Version not found');
    }
    const rowVersion = rowVersions[0];
    if (rowVersion.status !== 'pending' || rowVersion.status !== 'rejected') {
      throw new Error('Version not pending or rejected');
    }

    const tableName = rowVersion.table_name;
    assertTableAllowed(tableName);
    const meta = editableTables[tableName];

    const rowKeyObject = JSON.parse(rowVersion.row_key || '{}');
    const dataObject = JSON.parse(rowVersion.data);

    // sanitize: restrict dataObject keys to allowed columns only
    const validData = {};
    for (const column of meta.columns) {
      if (Object.prototype.hasOwnProperty.call(dataObject, column)) {
        validData[column] = dataObject[column];
      }
    }

    // Build and run appropriate SQL
    if (rowVersion.operation === 'insert') {
      // Insert only allowed columns
      const columns = Object.keys(validData);
      if (columns.length === 0) {
        throw new Error('No insertable columns');
      }
      const placeholders = columns.map(() => '?').join(', ');
      const statement = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')})
                         VALUES (${placeholders})`;
      const values = columns.map(c => validData[c]);
      await connection.query(statement, values);
    } else if (rowVersion.operation === 'update') {
      // Build SET from validData excluding primaryKey keys
      const pkKeys = meta.primaryKey;
      const setCols = Object.keys(validData).filter(k => !pkKeys.includes(k));
      if (setCols.length === 0) {
        // nothing to update
      } else {
        const setClause = setCols.map(c => `\`${c}\` = ?`).join(', ');
        const setValues = setCols.map(c => validData[c]);
        // build WHERE from rowKeyObject
        const whereKeys = Object.keys(rowKeyObject);
        if (whereKeys.length === 0) {
          throw new Error('Missing primary key in row_key for update');
        }
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        const whereValues = whereKeys.map(k => rowKeyObject[k]);
        const statement = `UPDATE \`${tableName}\`
                           SET ${setClause}
                           WHERE ${whereClause}
                           LIMIT 1`;
        await connection.query(statement, [...setValues, ...whereValues]);
      }
    } else if (rowVersion.operation === 'delete') {
      const whereKeys = Object.keys(rowKeyObject);
      if (whereKeys.length === 0) {
        throw new Error('Missing primary key in row_key for delete');
      }
      const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
      const whereValues = whereKeys.map(k => rowKeyObject[k]);
      const statement = `DELETE
                         FROM \`${tableName}\`
                         WHERE ${whereClause}
                         LIMIT 1`;
      await connection.query(statement, whereValues);
    } else {
      throw new Error('Unknown operation');
    }

    // mark version approved
    await connection.query('UPDATE row_versions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?', ['approved', approver, versionId]);

    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        console.log("rolling back");
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Failed to rollback: ", rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Failed to release connection: ", releaseError);
      }
    }
  }
}

export default router;
