import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';

router.get('/table-data/:tableName', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tableName = req.params.tableName;
        // Validate tableName to prevent SQL injection IMPORTANT!!
        const validTableNames = ['indicators', 'categories', 'indicatorValues']; // Add your actual table names

        if (!validTableNames.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        const queryString = `SELECT * FROM ${tableName} LIMIT 1000`;
        const result = await makeDbCallAsPromise(queryString);

        // console.log(result);

        res.json(result);
    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

function isAuthenticated(req, res, next) {
    // return next(); bypass authentication for... being awesome

    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

function isAdmin(req, res, next) {
    // return next(); bypass authentication for... being awesome

    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).json({ error: 'Not authorized' });
}

const allowedTables = {
    locations: {
        primaryKey: ['id'],
        columns: ['id','inst_address','lat','lng','inst_title','country','scale','population','density_km2','area_km2','area_ha','biodiversity_url','url_verifydate','wwf_biome','wwf_terrestrial_ecoregion','hotspot','conservation_status_wwf']
    },
    programs: {
        primaryKey: ['id'],
        columns: ['id','programName','description','programType','private','author','creationDate','iconFileName']
    },
    indicators: {
        primaryKey: ['id'],
        columns: ['id','indicatorName','positionInCategory','categoryId','archetype','weight','required','description','descriptionOfCalculation','calculation','private','author','creationDate']
    },
    documents: {
        primaryKey: ['id'],
        columns: ['id','inst_id','doc_type','doc_year','doc_title','doc_url','keywords','source_url','link_verified']
    },
    participation: {
        primaryKey: ['id'],
        columns: ['id','inst_id','part_category','part_name','part_year','part_data','part_units','part_level','part_link_label','part_link','part_link_label2','part_link2','part_link_label3','part_link3','keywords','link_verified']
    }
};

function assertTableAllowed(tableName) {
    if (!allowedTables[tableName]) {
        const err = new Error('Invalid table name');
        err.code = 'INVALID_TABLE';
        throw err;
    }
}

async function createPendingChange(pool, tableName, rowKeyObj, operation, dataObj, user) {
    assertTableAllowed(tableName);
    const pkJson = JSON.stringify(rowKeyObj || {});
    const dataJson = JSON.stringify(dataObj || {});
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // compute next version for this table+row_key
        const [rowsBetter] = await conn.query(
            "SELECT COALESCE(MAX(version),0) + 1 AS next_version FROM row_versions WHERE table_name = ? AND JSON_UNQUOTE(JSON_EXTRACT(row_key, '$')) = ?",
            [tableName, pkJson]
        );
        const nextVersion = (rows[0] && rows[0].next_version) || 1;
        await conn.query(
            'INSERT INTO row_versions (table_name, row_key, operation, data, version, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [tableName, pkJson, operation, dataJson, nextVersion, user]
        );
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
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
        if (rowVersion.status !== 'pending') {
            throw new Error('Version not pending');
        }

        const tableName = rowVersion.table_name;
        assertTableAllowed(tableName);
        const meta = allowedTables[tableName];

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
            const statement = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
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
                const statement = `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause} LIMIT 1`;
                await connection.query(statement, [...setValues, ...whereValues]);
            }
        } else if (rowVersion.operation === 'delete') {
            const whereKeys = Object.keys(rowKeyObject);
            if (whereKeys.length === 0) {
                throw new Error('Missing primary key in row_key for delete');
            }
            const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
            const whereValues = whereKeys.map(k => rowKeyObject[k]);
            const statement = `DELETE FROM \`${tableName}\` WHERE ${whereClause} LIMIT 1`;
            await connection.query(statement, whereValues);
        } else {
            throw new Error('Unknown operation');
        }

        // mark version approved
        await connection.query('UPDATE row_versions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?', ['approved', approver, versionId]);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export default router;