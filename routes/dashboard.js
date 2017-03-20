var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');

var app = express();

app.use(session({
    cookieName: 'session',
    secret: process.argv[3],
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

router.get('/', function(req, res, next) {
    console.log("dashboard");
    if (req.session && req.session.user) {
        console.log("logged in as " + req.session.user);
        res.render('index',{title:"You are logged in"});
    } else {
        console.log("not logged in");
        req.session.reset();
        res.redirect('/users');
    }
});

module.exports = router;