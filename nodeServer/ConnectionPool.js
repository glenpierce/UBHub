import config from './config.js';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase,
    decimalNumbers: true,
    waitForConnections: true,
    connectionLimit: 10,
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Successfully connected to the database.");
        connection.release();
    } catch (err) {
        console.error("Error connecting to the database:", err.code, err.message);
    }
})();

const getConnection = async () => {
    return pool.getConnection();
};

/**
 * Runs the provided async function inside a transaction.
 * fn receives the acquired connection and should use it for queries.
 */
const withTransaction = async (fn) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        try { await conn.rollback(); } catch (_) {}
        throw err;
    } finally {
        conn.release();
    }
};

const makeDbCallAsPromise = async function (queryString, params = []) {
    try {
        const [rows] = await pool.query(queryString, params);
        if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
            return rows[0];
        }
        return rows;
    } catch (err) {
        console.log("no DB connection or query error");
        console.log(err.code);
        console.log(err.message);
        throw err;
    }
};

export { pool, getConnection, withTransaction, makeDbCallAsPromise };
