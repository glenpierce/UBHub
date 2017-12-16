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
    //TODO: make this actually find the first ancestor post, generate THAT page,
    //but anchor down to the requested post.

    //var ancestor_id = getFirstAncestor(post_id);

      if (req.session && req.session.user) {

        var connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });
        connection.connect();

        query = `CALL getPostAndAllSubs(${post_id})`;
        connection.query(query, function(err, rows, fields) {
            if (!err) {
              //console.log(rows);
              renderPost(post_id, rows[0], res);

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
      query = `CALL AddForumPost('${req.session.user}', '${req.body.parentPost}', '${req.body.questionTitle}', '${req.body.questionBody}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}')`;
      connection.query(query, function(err, rows, fields) {
          if (!err) {
              //If successful, redirect to the post page
              var row = rows[0][0];
              var pageId;

              if(row.parent === -1){
                pageId = row.id;
              } else {
                pageId = row.parent;
              }


              res.json({ path: `/forum/post?id=${pageId}`});
          } else {
              res.json({ path: `/forum/`});
              console.log(err);
          }
          console.log(path);
          //TODO Actually return the path value so that the browser can redirect
      });
      connection.end();


    }
});

/*var getChildPosts = (parent_post, res, get_subs) => {
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
*/
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
    //console.log(rows[0]);
    //console.log("Rendering " + rows[0].length + " rows")
    res.render('forum', {posts: rows[0]});
}

var renderPost = (postId, rows, res) => {
  //Create a tree referencing each item in rows to an index in rows;
  var postHierarchy = createHierarchy(postId, rows);
  console.log(JSON.stringify(postHierarchy));
  console.log(postHierarchy.author);
  //TODO: sort hierarchy by relevance
  //Pass that to render

  res.render('post', {postTree: postHierarchy});
}

//Consumes an array of posts and creates a hierarchical representation of them
//A valid post tree will stem from a node with parent -1, then have a layer of
//child nodes with parent of stem node. Each child node will have one layer of\
//children of their own.
//TODO: make this less of a mess
var createHierarchy = (topId, posts) => {
  //Sort posts by id. We can assume that any child post will have a higher id
  //than its parent post.
  posts = posts.map(x => forumPostFromRow(x))
  console.log("Posts mapped:");
  console.log(posts);

  posts.sort(function(a, b) {
    if(a.id > b.id) {
      return 1;
    } else if (a.id < b.id){
      return -1;
    } else {
      console.error("Same id detected! Something has gone wrong.")
    }
  })

  var postTree;

  if(posts[0].parent === -1){
    postTree = forumPostFromRow(posts.shift());
  } else {
    console.error("No first-level post found. Something has gone wrong!")
  }


  var entriesCount = posts.length;


  postTree = insertIntoTree(posts, postTree);
  console.log("Returning tree:");
  console.log(postTree);
  return postTree;
}

function insertIntoTree(lop, t){
  if(lop.length <= 0){
    return t;
  }

  p = lop.shift();

  if(t.id === p.parent) {
      t.children.push(p);
      return insertIntoTree(lop, t);
  } else {
    var notFound = true;
    var i = 0;
    while(notFound && i < t.children.length) {
      if(t.children[i].id === p.parent){
        t.children[i].children.push(p);
        notFound = false;
        return insertIntoTree(lop, t);
      }
    i++;
    }
    if (tried >= t.children.length){
      console.log("options exhausted!");
    }
  }
}

//Returns ancestor post with parent of -1.
function getFirstAncestor(postId){

}

//Note: this should mirror the posts table, created in databaseUpdate.js, but with added children post objects.
function ForumPost(id, parent, author, subject, body, creationDate, upvotes, downvotes, views, tags, keywords, status, acceptedAnswerId, children){
  this.id = id;
  this.parent = parent;
  this.author = author;
  this.subject = subject;
  this.body = body;
  this.creationDate = creationDate;
  this.upvotes = upvotes;
  this.downvotes = downvotes;
  this.views = views;
  this.tags = tags;
  this.keywords = keywords;
  this.status = status;
  this.acceptedAnswerId = acceptedAnswerId;
  this.children = children; //Other post objects
}

function forumPostFromRow(row){
  return new ForumPost(row.id, row.parent, row.author, row.subject, row.body, row.creationDate, row.upvotes, row.downvotes, row.views, row.tags, row.keywords, row.status, row.acceptedAnswerId, []);
}

module.exports = router;
