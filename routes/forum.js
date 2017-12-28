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
        getPostsAsList(renderPosts, res);
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
  if (req.session && req.session.user) {
    var post_id = req.query.id;
    //TODO: make this actually find the first ancestor post, generate THAT page,
    //but #anchor down to the requested post.
    //var ancestor_id = getFirstAncestor(post_id);
      getPostsAsTree(post_id, res, req.session.user, (posts) => {
        renderPostTree(post_id, posts, res);
      });
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
    } else {
      console.log("not logged in");
      req.session.reset();
      res.redirect('/');
    }
});

router.post("/vote", function(req, res) {

  if (req.session && req.session.user) {
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    var voteDelta = req.body.voteDelta;
    var user = req.session.user;
    var postId = req.body.postId;
    var query;

    //TODO: first check if vote is valid

    if(voteDelta == -1){
      query = `CALL downvotePostById("${user}", ${postId});`
    } else {
      query = `CALL upvotePostById("${user}", ${postId});`
    }

    connection.query(query, function(err, rows, fields) {
      if(!err){

      } else {
        console.log(err);
      }
    })

  }

})


router.post("/unvote", function(req, res) {

  if (req.session && req.session.user) {
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    var voteDelta = req.body.voteDelta;
    var user = req.session.user;
    var postId = req.body.postId;


    //TODO: first check if vote is valid
    var query = `CALL unvoteForPost(${postId}, "${user}");`

    console.log(query);

    connection.query(query, function(err, rows, fields) {
      if(!err){

      } else {
        console.log(err);
      }
    })

  }
})

var renderPosts = (posts, res) => {
  res.render('forum', {posts: posts});
}

var renderPostTree = (postId, postHierarchy, res) => {
  res.render('post', {postTree: postHierarchy});
}

var getPostsAsList = (callback, res) => {
  //TODO: implement pagination

  var connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  //TODO: currently hardcoded for homepage, parentless posts. Make this dynamic,
  //to be used with search, tag view, etc.

  query = `CALL getPostsByParent(-1)`;

  fetchPosts(connection, query)
  .then((rows) => {
    var posts = rows[0].map(row => forumPostFromRow(row));
    return posts;
  })
  .then((posts) =>{
    return attachVotes(posts, connection);
  })
  .then((posts) =>{
    callback(posts, res);
    connection.end();
  })
  .catch((err) => {
    console.log(err);
    connection.end();
  })
}

var getPostsAsTree = function(postId, res, userId, callback) {

  var connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  query = `CALL getPostAndAllSubs(${postId})`;

  fetchPosts(connection, query)
  .then((rows) => {
    var posts = rows[0].map(row => forumPostFromRow(row));
    return posts;
  })
  .then((posts) => {
    return attachVotes(posts, connection);
  })
  .then((posts) => {
    return attachVoteStatuses(posts, userId, connection);
  })
  .then((votedPosts) => {
    addViews(votedPosts);
    return createHierarchy(postId, votedPosts);
  })
  .then((postTree) =>{
    callback(postTree, postId, res);
    connection.end();
  })
  .catch((err) =>{
    console.log(err);
    connection.end();
  })
}


var fetchPosts = function (connection, query) {
  return new Promise((resolve, reject) => {
    connection.query(query, function(err, rows, fields) {
        if (!err) {
          resolve(rows);
        } else {
          reject(err);
        }
      })
    });
}

function attachVotes(posts, connection) {
  return Promise.all(posts.map(function (post) {
    return attachPostVotes(post, connection);
  }));
}

function attachPostVotes(post, connection){
  return new Promise((resolve, reject) => {
    var newPost = post;
    var q1 = `CALL getUpvotesTotal(${post.id})`;
    var q2 = `CALL getDownvotesTotal(${post.id})`;

    connection.query(q1, function(err, rows, fields){
      if(!err){
        newPost.upvotes = 0 + rows[0][0]['SUM(deltaUpvotes)'];

        connection.query(q2, function(err, rows, fields) {
          if(!err){
            newPost.downvotes = 0 -rows[0][0]['SUM(deltaUpvotes)'];
            newPost.votesDelta = newPost.upvotes - newPost.downvotes;
            resolve(newPost);
          } else {
            reject(err);
          }
        })
      } else {
        reject(err);
      }
    });
  });
}

function attachVoteStatuses(posts, authorId, connection) {
  return Promise.all(posts.map(function (post) {
    return attachPostVoteStatus(post, authorId, connection);
  }));
}

function attachPostVoteStatus(post, authorId, connection){
  return new Promise((resolve, reject) =>{
    var newPost = post;
    var query = `CALL getAuthorVoteForPost(${post.id}, "${authorId}")`;
    connection.query(query, function(err, rows, fields){
      if(!err){
        if(rows[0].length <= 0) {
          newPost.userVoteStatus = 0;
        } else {
          newPost.userVoteStatus = rows[0][0].deltaUpvotes;
        }
        resolve(newPost);
      } else {
        reject(err);
      }
    })
  });
}

function addViews(posts) {
  var connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  posts.map(post => addView(post, connection));

  connection.end();
}

function addView(post, connection){
    var query = `CALL addView(${post.id})`;
    connection.query(query, function(err, rows, fields){
      if(!err) {
        //return post;
      } else {
        console.log(`Cannot add view to post id ${post.id}`);
        //return post;
      }
  });
}



//Consumes an array of posts and creates a hierarchical representation of them
//A valid post tree will stem from a node with parent -1, then have a layer of
//child nodes with parent of stem node. Each child node will have one layer of
//children of their own.
//TODO: make this less of a mess
var createHierarchy = (topId, posts) => {


  return new Promise((resolve, reject) => {

    //Sort posts by id. We can assume that any child post will have a higher id
    //than its parent post.
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
      postTree = posts.shift();
    } else {
      console.error("No first-level post found. Something has gone wrong!")
    }

    var entriesCount = posts.length;

    postTree = insertIntoTree(posts, postTree);
    console.log(JSON.stringify(postTree, undefined, 2));

    resolve(postTree);
  });
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
      console.log("Insertion options exhausted!");
    }
  }
}

//Returns ancestor post with parent of -1.
function getFirstAncestor(postId){

}

//Note: this should mirror the posts table, created in databaseUpdate.js, but
//with added children post objects, upvotes and downvotes.
function ForumPost(id, parent, author, subject, body, creationDate, upvotes, downvotes, userVoteStatus, views, tags, keywords, status, acceptedAnswerId, children){
  this.id = id;
  this.parent = parent;
  this.author = author;
  this.subject = subject;
  this.body = body;
  this.creationDate = creationDate;
  this.upvotes = upvotes;
  this.downvotes = downvotes;
  this.votesDelta = upvotes - downvotes;
  this.userVoteStatus = userVoteStatus;
  this.views = views;
  this.tags = tags;
  this.keywords = keywords;
  this.status = status;
  this.acceptedAnswerId = acceptedAnswerId;
  this.children = children; //Other post objects
}

function forumPostFromRow(row){

  return new ForumPost(
    row.id,
    row.parent,
    row.author,
    row.subject,
    row.body,
    row.creationDate,
    -1,
    -1,
    0,
    row.views,
    row.tags,
    row.keywords,
    row.status,
    row.acceptedAnswerId,
    []);
}

module.exports = router;
