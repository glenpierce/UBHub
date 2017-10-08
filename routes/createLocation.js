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
    res.render('createLocation', {username:req.session.user});
});

router.post('/', function(req, res){
    console.log(req.body);
    // connection = mysql.createConnection({
    //     host: config.rdsHost,
    //     user: config.rdsUser,
    //     password: config.rdsPassword,
    //     database: config.rdsDatabase
    // });
    //
    // connection.connect();
    // query = 'insert into sites2 (siteName) values (' + req.body + ')';
    // console.log(query);
    // connection.query(query, function(err, rows, fields) {
    //     if (!err) {
    res.send('dashboard');
    // return res.send('/changeLocation');
    //     }
    // });
    // connection.end();
});

module.exports = router;