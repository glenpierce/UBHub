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
            let row = JSON.parse(JSON.stringify(result[key]));
            let found = false;
            for(let i = 0; i < jsonData.ids.length; i++) {
                if (jsonData.ids[i] == row.id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                jsonData.names.push(row.name);
                jsonData.ids.push(row.id);
            }
        });
        res.render('programs', {username: req.session.user, rows: jsonData, query: req.query.id});
    });
});

function getUserDataForProgram(programId, req) {
    return new Promise(function (resolve, reject) {
        let queryString = "select * from userData where program = " + programId + " and userEmail = '" + req.session.user + "';";
        makeDbCall(queryString, resolve);
    });
}

module.exports = router;
