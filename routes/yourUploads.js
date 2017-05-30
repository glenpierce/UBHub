var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

router.get('/', function(req, res, next) {
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'CALL getAllUploadsByUser("' + req.session.user + '")';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            // console.log({data:rows[0]});
            data = JSON.stringify(rows[0]);
            console.log(data);
            res.render('yourUploads', {fromServer:data});
        } else {
            console.log(err);
        }
    });
    connection.end();
});

module.exports = router;