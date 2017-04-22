var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

app.use(session({
    cookieName: 'session',
    secret: process.argv[3],
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

// router.get('/', function(req, res, next) {
//     console.log("indicators");
//     if (req.session && req.session.user) {
//         console.log("logged in as " + req.session.user);
//         res.sendFile(path.join(__dirname+'/cbiindicators.html'));
//     } else {
//         console.log("not logged in");
//         req.session.reset();
//         res.redirect('/index');
//     }
// });

router.get('/', function(req, res, next) {
    console.log("logged in as " + req.session.user);
    res.render('indicators',{userName: req.session.user, category:"", number:"1", title:"whatever", value:"4"});
});

module.exports = router;