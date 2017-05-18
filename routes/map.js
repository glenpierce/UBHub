var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

router.get('/', function(req, res, next) {
    console.log("map");
    var mapData = "MAPDATA!";

    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    connection.query('SELECT * from markers', function(err, rows, fields) {
        if (!err) {
            // console.log('The user db contains: ', rows);
            mapData = rows;
            console.log(mapData);
            if (req.session && req.session.user) {
                console.log("logged in as " + req.session.user);
                console.log(mapData);
                res.render('map', {mapData:JSON.stringify(mapData)});
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

router.post('/', function (req, res) {
    console.log(req.body);
    res.redirect('back');
});

module.exports = router;