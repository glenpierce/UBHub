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

        getPosts(renderPosts, res);

    } else {

        req.session.reset();
        res.redirect('/');
    }
});



router.get('/ask', function(req, res, next) {
  if (req.session && req.session.user) {
      console.log("logged in as " + req.session.user);
      res.render('ask');
  } else {
      console.log("not logged in");
      req.session.reset();
      res.redirect('/');
  }
});

router.get('/post', function(req, res, next) {

    var post_id = req.query.id;

      if (req.session && req.session.user) {

        var connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });
        connection.connect();

        query = `CALL getPostById(${post_id})`;
        connection.query(query, function(err, rows, fields) {
            if (!err) {

              getChildPosts(rows[0][0], res, true);

            } else {
              res.render('forum', []);
              console.log(err);
            }
          });
          connection.end();
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
      console.log(req.body.parentPost);
      query = `CALL AddForumPost('${req.session.user}', '${req.body.parentPost}', '${req.body.questionTitle}', '${req.body.questionBody}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}')`;
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

var getChildPosts = (parent_post, res, get_subs) => {
  var connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  query = `CALL getPostsByParent(${parent_post.id})`;
  connection.query(query, function(err, rows, fields) {
      if (!err) {

        getChildComments();
        renderPost(parent_post, rows[0], res);

      } else {
        res.render('forum', []);
        console.log(err);
      }
    });
    connection.end();
  }

var getChildComments = (posts) => {
  //TODO: this
}

var getPosts = (callback, res) => {
    //TODO: implement pagination

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });
    connection.connect();
    query = `CALL getPostsByParent(-1)`;
    connection.query(query, function(err, rows, fields) {
        if (!err) {

          callback(err, rows, res);

        } else {
          res.render('forum', []);
          console.log(err);
        }
        console.log(path);
    });
    connection.end();
  }

  var renderPosts = (err, rows, res) => {
      console.log(rows[0]);
      console.log("Rendering " + rows[0].length + " rows")
      res.render('forum', {posts: rows[0]});
  }

  var renderPost = (post, children, res) => {
    console.log(children);
    res.render('post', {post: post,
                        children: children});
  }

module.exports = router;
