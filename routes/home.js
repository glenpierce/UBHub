var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

/* GET home page. */
router.get('/', function(req, res, next) {
    // res.render('home', {mapData:null});
    var mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations limit 100';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            res.render('home', {mapData:JSON.stringify(mapData), username: req.session.user});
        } else {
            console.log('Error while performing Query.');
            res.render('home', {mapData:null, username: req.session.user});
        }
    });
    connection.end();
});

module.exports = router;
