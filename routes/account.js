const express = require('express');
const mysql = require('mysql');
const router = express.Router();
const path = require("path");
const request = require('request');
const config = require('../config.js');

router.get('/', function(req, res, next) {
    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    const query = `Call getRepByUser('${req.session.user}')`;
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            const userRep = rows[0][0].totalScore;
            res.render('account', {userName: req.session.user, userRep: userRep});
        } else {
            // res.render('account', {userName: req.session.user, userRep: null});
            res.render('index');
        }
    });
    connection.end();
});


module.exports = router;