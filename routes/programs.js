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
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

router.get('/', function (req, res, next) {
    getUserDataForProgram(req.query.id, req).then(function (rows) {
        console.log(rows);
        res.render('programs', {username: req.session.user, rows: JSON.stringify(rows), query: req.query.id});
    });
});

function getUserDataForProgram(programId, req) {
    return new Promise(function (resolve, reject) {
        makeDbCall("select * from userData where program = " + programId + " and userEmail = '" + req.session.user + "';", resolve);
    });
}

module.exports = router;