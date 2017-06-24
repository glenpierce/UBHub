var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var http = require('http');
var https = require('https');
var mysql = require('mysql');

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

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
            if (req.session && req.session.user) {
                res.render('map', {mapData:JSON.stringify(mapData), username: req.session.user});
            } else {
                console.log("not logged in");
                req.session.reset();
                res.redirect('/index');
            }
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
});

router.get('/update', function(req, res, next) {
    // update();
});

function update(){
    mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations where lat is null';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            rows.forEach(function (element){
                console.log("updating id=" + element.id);
                getLatLong(element.address, element.id);
            });
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
}

module.exports = router;