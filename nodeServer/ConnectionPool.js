import config from './config.js';
import mysql from 'mysql2';

const pool = mysql.createPool({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase
});

const makeDbCallAsPromise = function(queryString, params = []) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (error, connection) {
            if (error) {
                console.log("no DB connection");
                return reject(error);
            }
            connection.query(queryString, params, function (err, rows, fields) {
                connection.release();
                if (!err) {
                    resolve(rows);
                } else {
                    console.log('Error while performing Query.');
                    console.log(err.code);
                    console.log(err.message);
                    reject(err);
                }
            });
        });
    });
};

export { pool, makeDbCallAsPromise };
