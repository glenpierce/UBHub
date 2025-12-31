import config from './config.js';
import mysql from 'mysql2';

const pool = mysql.createPool({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase,
    decimalNumbers: true,
});

const promisePool = pool.promise();

promisePool.getConnection()
    .then((connection) => {
        console.log('Successfully connected to the database.');
        connection.release();
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err.code, err.message);
    });

const makeDbCallAsPromise = async function(queryString, params = []) {
    try {
        const [rows] = await promisePool.query(queryString, params);
        // If a stored procedure returned multiple result sets, rows can be an array of arrays.
        // Return the first result set for compatibility with existing callers.
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

export { pool, promisePool, makeDbCallAsPromise };
