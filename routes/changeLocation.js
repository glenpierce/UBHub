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
    expires: new Date(Date.now() + (config.expires))
}));

router.get('/', function(req, res, next) {
    var sites = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = `Call getSitesByUser('${req.session.user}')`;
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            sites = rows[0];
            res.render('changeLocation', {sites:JSON.stringify(sites), username:req.session.user});
        }
    });
    connection.end();
});

router.post('/', function(req, res){
});

module.exports = router;
