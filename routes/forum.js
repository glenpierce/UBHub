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

/*
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

*/
router.get('/', function(req, res, next) {
    console.log("forum");
    if (req.session && req.session.user) {
        console.log("logged in as " + req.session.user);
        res.render('forum');
    } else {
        console.log("not logged in");
        req.session.reset();
        res.redirect('/');
    }
});


router.get('/ask', function(req, res, next) {
  console.log("forum");
  if (req.session && req.session.user) {
      console.log("logged in as " + req.session.user);
      res.render('ask');
  } else {
      console.log("not logged in");
      req.session.reset();
      res.redirect('/');
  }
});

router.post("/submit", function (req, res) {
    //TODO: make sure the post is legal etc.
    if (req.session && req.session.user) {
      
    }
});


module.exports = router;
