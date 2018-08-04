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
    duration: config.duration,
    activeDuration: config.activeDuration
}));

router.get('/', function(req, res, next) {
    var indicators = "";

    // connection = mysql.createConnection({
    //     host: config.rdsHost,
    //     user: config.rdsUser,
    //     password: config.rdsPassword,
    //     database: config.rdsDatabase
    // });
    //
    // connection.connect();
    // connection.query(query, function(err, rows, fields) {
    //     if (!err) {
            res.render('createIndicator', {username:req.session.user});
            // console.log({indicators:JSON.stringify(indicators)});
    //     }
    // });
    // connection.end();
});

router.post('/', function(req, res){
    console.log(req.body);
    if (true || req.session && req.session.user) {
        query = "CALL createIndicator('" + req.body.name + "', '" + req.session.user +"');";

        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                res.status(200).json({indicatorName: rows[0][0].indicatorName, id: rows[0][0].id});
                res.end();
            } else {
                console.log('Error while performing Query.');
                console.log(query);
                console.log(err.code);
                console.log(err.message);
            }
        });
        connection.end();
    } else {
        console.log("not logged in");
    }
});

module.exports = router;