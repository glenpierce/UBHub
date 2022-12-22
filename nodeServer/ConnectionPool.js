const config = require('./config.js');
const mysql = require('mysql');

const pool = mysql.createPool({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase
});

const makeDbCallAsPromise = function(queryString) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (error, connection) {
            connection.query(queryString, function (err, rows, fields) {
                if (!err) {
                    resolve(rows);
                } else {
                    console.log('Error while performing Query.');
                    console.log(err.code);
                    console.log(err.message);
                    reject(err);
                }
            });
            connection.release();
        });
    });
};

exports.pool = pool;
exports.makeDbCallAsPromise = makeDbCallAsPromise;