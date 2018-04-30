const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const session = require('client-sessions');
const path = require("path");

const app = express();

const config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

/********/
/*ROUTES*/
/********/

router.get('/', function(req, res, next) {

    let page = req.query.page;
    if(!page) {
      page = 1;
    }

    let sort = req.query.sort;
    if(!sort) {
      sort = "date";
    }

    const perPage = 5;

    if (req.session && req.session.user) {
        getPostsAsList(renderPosts, res, perPage, page, sort, "");
    } else {
        req.session.reset();
        res.redirect('/');
    }
});

router.get('/search', function(req, res, next) {

    let page = req.query.page;
    if(!page) {
      page = 1;
    }

    let sort = req.query.sort;
    if(!sort) {
      sort = "date";
    }

    const search = req.query.s;
    if(!search) {
      res.redirect('/');
    }

    const perPage = 5;

    //TODO: better backend search
    if (req.session && req.session.user) {
        getPostsAsList(renderPosts, res, perPage, page, sort, search);
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
    const postId = req.query.id;
    let pageId;


    getFirstAncestor(postId)
    .then((anc) => {
      console.log("ANCESTOR", JSON.stringify(anc, undefined, 2));

      pageId = anc.id;
      getPostsAsTree(pageId, res, req.session.user, (posts) => {
        renderPostTree(pageId, posts, res, postId);
      });

    })

  } else {
      console.log("not logged in");
      req.session.reset();
      res.redirect('/');
  }
});


router.post("/submit", function (req, res) {
  //TODO: make sure the post is legal etc.
  //Is user logged in? DONE
  //Does user have post privileges? TODO
  //Does the post have the required fields? (subject, body, parentPost) DONE
  //Does the post pass spam filters TODO (if necessary)

  const body = req.body.questionBody.trim();
  const title = req.body.questionTitle.trim();
  const parent = req.body.parentPost;
  const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (req.session && req.session.user && body != "" && title != "" && parent != undefined) {
      let tags = [];
      if(req.body.tags)
          tags = req.body.tags.split(',');
      const connection = mysql.createConnection({
          host: config.rdsHost,
          user: config.rdsUser,
          password: config.rdsPassword,
          database: config.rdsDatabase
      });

      let path = "";
      connection.connect();
      const query = `CALL AddForumPost('${req.session.user}', '${parent}', '${title}', '${body}', '${date}', '${tags}')`;
      connection.query(query, function(err, rows, fields) {
          if (!err) {
              //If successful, redirect to the post page
              const row = rows[0][0];
              let pageId;

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
      console.log("Illegal post or no user found.");
    }
});

router.post("/vote", function(req, res) {

  //TODO: first check if vote is valid
  //Is user logged in? DONE
  //Does user have vote privileges? TODO
  //Has user ever voted for this post before? DONE

  const voteDelta = req.body.vote;
  const user = req.session.user;
  const postId = req.body.postId;

  console.log("Hit vote");

  if (req.session && req.session.user) {
    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    getUserVoteForPost(postId, user, connection)
    .then((pastVote) => {
      if (pastVote === 0) {

        var query;

        if(voteDelta == -1){
          query = `CALL downvotePostById("${user}", ${postId});`
        } else {
          query = `CALL upvotePostById("${user}", ${postId});`
        }

        connection.query(query, function(err, rows, fields) {
          if(err)
            console.log(err);
        });
      } else {
        console.log("Already voted for this post");
      }
    });
  } else {
      console.log("Not logged in");
  }
});


router.post("/unvote", function(req, res) {

  //TODO: Check if unvote is valid
  //Is the correct user logged in? DONE
  //Does user have vote privileges? TODO

  if (req.session && req.session.user) {
    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    const voteDelta = req.body.voteDelta;
    const user = req.session.user;
    const postId = req.body.postId;

    const query = `CALL unvoteForPost(${postId}, "${user}");`;

    connection.query(query, function(err, rows, fields) {
      if(err)
        console.log(err);
    })
  }
});

router.post("/accept", function(req, res){

  if (req.session && req.session.user) {
    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    const postId = req.body.postId;
    const answerId = req.body.answerId;

    getPostData(postId, connection)
    .then((parentPost)=>{
      if(parentPost.author === req.session.user){

        const query = `CALL acceptPost(${answerId}, ${postId})`;

        connection.query(query, function(err, rows, fields) {
          if(err){
            console.log(err);
          }
          connection.end();
        })
      } else {
        console.log("parentPost.author !== req.session.user");
      }
    });
  }
});


/***********/
/*RENDERING*/
/***********/


const renderPosts = (posts, res, perPage, page, sort, search) => {
  //TODO: filter search results out earlier. This is just for alpha
  //TODO: Probably not have the pagination and sorting run here, but this will
  //work for prototype amounts of data.

  //SEARCH
  if(search) {
    posts = posts.filter((post) => {
      return (post.subject.includes(search) || post.body.includes(search));
    })
  }

  //SORTING

  if(sort === "score"){
    posts.sort(function(a, b) {
      if(a.votesDelta < b.votesDelta) {
        return 1;
      } else if (a.votesDelta >= b.votesDelta){
        return -1;
      }
    });
  } else {
    //Default to by date modified (i.e. last commented on, edited, voted etc.).
    //TODO: Make this last date MODIFIED, not CREATED
    posts.sort(function(a, b) {
      if(a.creationDate < b.creationDate) {
        return 1;
      } else if (a.creationDate >= b.creationDate){
        return -1;
      }
    });
  }

  //PAGINATION
  page = parseInt(page);
  perPage = parseInt(perPage);
  const finalPage = Math.ceil(posts.length/perPage);
  const postsToRender = posts.slice((page - 1)*perPage, page*perPage);
  const lastPage = page === 1 ? false: page - 1;
  const nextPage = page === finalPage ? false: page + 1;

  res.render('forum', {
    posts: postsToRender,
    sort,
    nextPage,
    page,
    finalPage,
    lastPage
  });
};

const renderPostTree = (pageId, postHierarchy, res, postId) => {
  let scroll = "postTop";
  if (pageId != postId){
    scroll = "post" + postId;
  }

  console.log("postHierarchy:");
  console.log(postHierarchy);

  res.render('post', {postTree: postHierarchy,
                      scrollPost: scroll
                    });
};


/********/
/*DATA***/
/********/

const getPostsAsList = (callback, res, perPage, page, sort, search) => {
  //TODO: implement pagination

  const connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  //TODO: currently hardcoded for homepage, parentless posts. Make this dynamic,
  //to be used with search, tag view, etc.

  const query = `CALL getPostsByParent(-1)`;

  fetchPosts(connection, query)
  .then((rows) => {
    const posts = rows[0].map(row => forumPostFromRow(row));
    return posts;
  })
  .then((posts) =>{
    return attachVotes(posts, connection);
  })
  .then((posts) =>{
    return getAnswersData(posts, connection);
  })
  .then((posts) =>{
    callback(posts, res, perPage, page, sort, search);
    connection.end();
  })
  .catch((err) => {
    console.log(err);
    connection.end();
  })
};

const getPostsAsTree = function(postId, res, userId, callback) {

  const connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });
  connection.connect();

  const query = `CALL getPostAndAllSubs(${postId})`;

  fetchPosts(connection, query)
  .then((rows) => {
    const posts = rows[0].map(row => forumPostFromRow(row));
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
    return createHierarchy(postId, votedPosts, userId);
  })
  .then((postTree) =>{
    callback(postTree, postId, res);
    connection.end();
  })
  .catch((err) =>{
    console.log(err);
    connection.end();
  })
};


const fetchPosts = function (connection, query) {
  return new Promise((resolve, reject) => {
    connection.query(query, function(err, rows, fields) {
        if (!err) {
          resolve(rows);
        } else {
          reject(err);
        }
      })
    });
};

function attachVotes(posts, connection) {
  return Promise.all(posts.map(function (post) {
    return attachPostVotes(post, connection);
  }));
}

function attachPostVotes(post, connection){
  return new Promise((resolve, reject) => {
    let newPost = post;
    const q1 = `CALL getUpvotesTotal(${post.id})`;
    const q2 = `CALL getDownvotesTotal(${post.id})`;

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

function getAnswersData(posts, connection) {
  return Promise.all(posts.map(function (post) {
    return getAnswerData(post, connection);
  }));
}

function getAnswerData(post, connection){
  return new Promise((resolve, reject) => {
  if(!post.acceptedAnswerId){
    resolve(post);
  } else {
    return getPostData(post.acceptedAnswerId, connection)
      .then((answerData) => {
        post.acceptedAnswer = forumPostFromRow(answerData);
        post.stringAnsweredBy = `Answered with ${answerData.subject} by ${answerData.author}`;
        resolve(post);
      })
      .catch((err) => {
        console.log(err);
      })
    }
  })
}



function attachVoteStatuses(posts, authorId, connection) {
  return Promise.all(posts.map(function (post) {
    return attachPostVoteStatus(post, authorId, connection);
  }));
}

function attachPostVoteStatus(post, authorId, connection){
  return new Promise((resolve, reject) =>{
    let newPost = post;
    const query = `CALL getAuthorVoteForPost(${post.id}, "${authorId}")`;
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
  const connection = mysql.createConnection({
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
    const query = `CALL addView(${post.id})`;
    connection.query(query, function(err, rows, fields){
      if(!err) {
        //return post;
      } else {
        console.log(`Cannot add view to post id ${post.id}`);
        //return post;
      }
  });
}

function getUserVoteForPost(id, user, connection){
  return new Promise((resolve, reject) => {

    const query = `CALL getAuthorVoteForPost(${id}, "${user}")`;

    connection.query(query, function(err, rows, fields){
      if(!err){
        if(rows[0].length <= 0) {
          console.log(0);
          resolve(0);
        } else {
          console.log(rows[0][0].deltaUpvotes);
          resolve(rows[0][0].deltaUpvotes);
        }
      } else {
        reject(err);
      }
    })

  });
}

function getPostData(id, connection){
  return new Promise((resolve, reject) => {
    const query = `CALL getPostById(${id})`;
    connection.query(query, function(err, rows, fields){
      if(!err){
        resolve(rows[0][0]);
      } else {
        reject(err);
      }
    })
  });
}



//Consumes an array of posts and creates a hierarchical representation of them
//A valid post tree will stem from a node with parent -1, then have a layer of
//child nodes with parent of stem node. Each child node will have one layer of
//children of their own.
//TODO: make this less of a mess
const createHierarchy = (topId, posts, currentUserId) => {

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
    });

    let postTree;

    if(posts[0].parent === -1){
      postTree = posts.shift();
    } else {
      console.error("No first-level post found. Something has gone wrong!")
    }

    let entriesCount = posts.length;
    let acceptedId = postTree.acceptedAnswerId;

    postTree = insertIntoTree(posts, postTree, currentUserId, acceptedId);
    console.log(JSON.stringify(postTree, undefined, 2));

    //Now sort first-level children with ACCEPTED ANSWER first, then rest by votes

    postTree.children.sort(function(a, b) {
      if(a.id == postTree.acceptedAnswerId) {
        return -1;
      } else if (a.votesDelta >= b.votesDelta) {
        return 0;
      } else if (a.id < b.id){
        return 1;
      }
    })


    resolve(postTree);
  });
};

function insertIntoTree(lop, t, u, a){
  if(lop.length <= 0){
    return t;
  }

  p = lop.shift();
  if(p.id == a){
    p.acceptedAnswer = true;
  } else {
    p.acceptedAnswer = false;
  }

  if(t.id === p.parent) {
      p.parentAuthor = t.author;
      p = canAccept(p, t.acceptedAnswerId, u);
      t.children.push(p);
      return insertIntoTree(lop, t, u, a);
  } else {
    let notFound = true;
    let i = 0;
    while(notFound && i < t.children.length) {
      if(t.children[i].id === p.parent){
        p.parentAuthor = t.children[i].author;
        p = canAccept(p, t.children[i].acceptedAnswerId, u);
        t.children[i].children.push(p);
        notFound = false;
        return insertIntoTree(lop, t, u, a);
      }
    i++;
    }
    if (tried >= t.children.length){
      console.log("Oh no! Insertion options exhausted!");
    }
  }
}



//Returns ancestor post with parent of -1.
function getFirstAncestor(postId){

  const connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });

  return new Promise((resolve, reject) =>{
    getPostData(postId, connection)
    .then((post) => {
      if(post.parent == -1){
        connection.end();
        resolve(post);
      } else {
        return getPostData(post.parent, connection);
      }
    })
    .then((parentPost) => {
      console.log("Parent:" , parentPost);
      if(parentPost) {
        if(parentPost.parent == -1){
          connection.end();
          resolve(parentPost);
        } else {
          return getPostData(parentPost.parent, connection);
        }
      }
    })
    .then((grandparentPost) => {
      if(grandparentPost) {
        console.log("Grandparent:" , grandparentPost);
        if(grandparentPost && grandparentPost.parent == -1){
          connection.end();
          resolve(grandparentPost);
        } else {
          reject("Something has gone wrong with post " + postId + " -- the tree is too deep!");
        }
      }
    })
    .catch((err) =>{
      connection.end();
      console.log(err);
    })
  })
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

  //Vars for post output:
  //TODO: make this more readable
  //TODO: get name of accepted post's author
  this.stringCreationDate = creationDate.toDateString() + " at " + creationDate.toTimeString();
  this.stringAnsweredBy = (acceptedAnswerId != null) ? "Answered with " + acceptedAnswerId : "Not answered yet.";

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

/*********/
/*UTILITY*/
/*********/

function canAccept(post, parentAcceptedId, currentUserId){

  if(post.parent > -1 &&
    post.author != currentUserId &&
    post.parentAuthor == currentUserId &&
    parentAcceptedId == null){
    post.canAccept = true;
    return post;
  }
  post.canAccept = false;
  return post;
}


module.exports = router;
