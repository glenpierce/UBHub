var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

/* GET home page. */
router.get('/', function(req, res, next) {
    var mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            res.render('home', {mapData:JSON.stringify(mapData)});
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
});

module.exports = router;