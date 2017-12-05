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
      var connection = mysql.createConnection({
          host: config.rdsHost,
          user: config.rdsUser,
          password: config.rdsPassword,
          database: config.rdsDatabase
      });
      var path="";
      connection.connect();
      query = `CALL AddForumPost('${req.session.user}', '-1', '${req.body.questionTitle}', '${req.body.questionBody}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}')`;
      connection.query(query, function(err, rows, fields) {
          if (!err) {
              //If successful, redirect to the post page
              path = `/forum/?q=${rows[0][0].id}`;
          } else {
              path = `/forum/ask`;
              console.log(err);
          }
          console.log(path);
          //TODO Actually return the path value so that the browser can redirect
          res.redirect(path);
      });
      connection.end();


    }
});

module.exports = router;
