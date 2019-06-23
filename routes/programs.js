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
    getUserDataForProgram(req.query.id, req).then(function (result) {
        let jsonData = {names:[], ids:[]};
        Object.keys(result).forEach(function(key) {
            let row = result[key];
            row = JSON.parse(JSON.stringify(row));
            let rowData = JSON.parse(row.jsonData);
            jsonData.names.push(rowData.endDate);
            jsonData.ids.push(row.id);
        });
        res.render('programs', {username: req.session.user, rows: jsonData, query: req.query.id});
    });
});

function getUserDataForProgram(programId, req) {
    return new Promise(function (resolve, reject) {
        let queryString = "select * from userData where program = " + programId + " and userEmail = '" + req.session.user + "';";
        queryString = "select * from userData;";
        makeDbCall(queryString, resolve);
    });
}

module.exports = router;