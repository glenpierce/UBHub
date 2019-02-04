var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var fs = require("fs");

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
    var contents = fs.readFileSync("./views/observations.json");
    var jsonContent = JSON.parse(contents);
    var jsonToSend = JSON.stringify(jsonContent);
    res.render('newprogram', {username: req.session.user, queryId: req.query.id, jsonToSend});
});

module.exports = router;