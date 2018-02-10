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
    console.log(req.query.id);
    if (req.session && req.session.user) {
        if(req.query.id){
            query = `Call selectSiteForUserAndReturnIt('${req.session.user}', '${req.query.id}')`;
        } else {
            query = `Call getSelectedSiteByUserQuery('${req.session.user}')`;
        }
        render = function (rows) {
            console.log(rows);
            res.render('dashboard', {rows: rows});
        };
        makeDbCall(query, render);
    } else {
        console.log("not logged in");
        req.session.reset();
        res.redirect('/');
    }
});

makeDbCall = function(queryString, callback){
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = queryString;
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            console.log(rows);
            callback(rows);
        } else {
            console.log('Error while performing Query.');
            console.log(err.code);
            console.log(err.message);
        }
    });
    connection.end();
};

module.exports = router;