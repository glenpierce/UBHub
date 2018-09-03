const config = require('./config.js');
const mysql = require('mysql');

const pool = mysql.createPool({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase
});

exports.pool = pool;