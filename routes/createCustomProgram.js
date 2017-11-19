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
    var indicators = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from indicators';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            console.log(rows);
            indicators = rows;
            res.render('customProgram', {indicators:JSON.stringify(indicators), username:req.session.user});
            console.log({indicators:JSON.stringify(indicators)});
        }
    });
    connection.end();
});

router.post('/', function(req, res){
    console.log(req.body);
});

module.exports = router;