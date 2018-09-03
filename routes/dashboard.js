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

    if (req.session.user) {

        var userData = {};

        function getSelectedSite() {
            return new Promise(function (resolve, reject) {
                if (req.session && req.session.user) {
                    if (req.query.id) {
                        query = `Call selectSiteForUserAndReturnIt('${req.session.user}', '${req.query.id}')`;
                    } else {
                        query = `Call getSelectedSiteByUserQuery('${req.session.user}')`;
                    }
                    connection = mysql.createConnection({
                        host: config.rdsHost,
                        user: config.rdsUser,
                        password: config.rdsPassword,
                        database: config.rdsDatabase
                    });

                    connection.connect();
                    console.log(query);
                    connection.query(query, function (err, rows, fields) {
                        if (!err) {
                            // console.log(rows);
                            resolve(rows);
                        } else {
                            console.log('Error while performing Query.');
                            console.log(err.code);
                            console.log(err.message);
                            reject(err);
                        }
                    });
                    connection.end();
                } else {
                    reject();
                }
            });
        }

        function getPrograms() {
            return new Promise(function (resolve, reject) {
                query = "";
                if (req.session && req.session.user) {
                    connection = mysql.createConnection({
                        host: config.rdsHost,
                        user: config.rdsUser,
                        password: config.rdsPassword,
                        database: config.rdsDatabase
                    });

                    connection.connect();
                    console.log(query);
                    connection.query(query, function (err, rows, fields) {
                        if (!err) {
                            console.log(rows);
                            resolve(rows);
                        } else {
                            console.log('Error while performing Query.');
                            console.log(err.code);
                            console.log(err.message);
                            reject(err);
                        }
                    });
                    connection.end();
                } else {
                    reject();
                }
            });
        }

        function getCategories() {
            return new Promise(function (resolve, reject) {
                query = "";
                if (req.session && req.session.user) {
                    connection = mysql.createConnection({
                        host: config.rdsHost,
                        user: config.rdsUser,
                        password: config.rdsPassword,
                        database: config.rdsDatabase
                    });

                    connection.connect();
                    console.log(query);
                    connection.query(query, function (err, rows, fields) {
                        if (!err) {
                            console.log(rows);
                            resolve(rows);
                        } else {
                            console.log('Error while performing Query.');
                            console.log(err.code);
                            console.log(err.message);
                            reject(err);
                        }
                    });
                    connection.end();
                } else {
                    reject();
                }
            });
        }

        function getIndicators() {
            return new Promise(function (resolve, reject) {
                query = "";
                if (req.session && req.session.user) {
                    connection = mysql.createConnection({
                        host: config.rdsHost,
                        user: config.rdsUser,
                        password: config.rdsPassword,
                        database: config.rdsDatabase
                    });

                    connection.connect();
                    console.log(query);
                    connection.query(query, function (err, rows, fields) {
                        if (!err) {
                            console.log(rows);
                            resolve(rows);
                        } else {
                            console.log('Error while performing Query.');
                            console.log(err.code);
                            console.log(err.message);
                            reject(err);
                        }
                    });
                    connection.end();
                } else {
                    reject();
                }
            });
        }

        function getUserData(siteId) {
            return new Promise(function (resolve, reject) {
                query = "select * from userData where site = " + siteId;
                if (req.session && req.session.user) {
                    connection = mysql.createConnection({
                        host: config.rdsHost,
                        user: config.rdsUser,
                        password: config.rdsPassword,
                        database: config.rdsDatabase
                    });

                    connection.connect();
                    console.log(query);
                    connection.query(query, function (err, rows, fields) {
                        if (!err) {
                            console.log(rows);
                            resolve(rows);
                        } else {
                            console.log('Error while performing Query.');
                            console.log(err.code);
                            console.log(err.message);
                            reject(err);
                        }
                    });
                    connection.end();
                } else {
                    reject();
                }
            });
        }

        getSelectedSite().then(function (values) {
            console.log(values[0][0].siteName);
            getUserData(values[0][0].id);
            res.render('dashboard', {username: req.session.user});
        }).catch(function (error) {
                console.log(error);
                res.render('dashboard', {username: req.session.user});
            }
        );

        // Promise.all([getSelectedSite, getPrograms, getCategories, getIndicators, getUserData]).then(function(values) {
        //     console.log(values);
        // });

    } else {
        res.redirect('home');
    }

});

// router.get('/', function(req, res, next) {
//     console.log(req.query.id);
//     if (req.session && req.session.user) {
//         if(req.query.id){
//             query = `Call selectSiteForUserAndReturnIt('${req.session.user}', '${req.query.id}')`;
//         } else {
//             query = `Call getSelectedSiteByUserQuery('${req.session.user}')`;
//         }
//         render = function (rows) {
//             console.log(rows);
//             res.render('dashboard', {rows: rows});
//         };
//         makeDbCall(query, render);
//     } else {
//         console.log("not logged in");
//         req.session.reset();
//         res.redirect('/');
//     }
// });

makeDbCall = function (queryString, callback) {
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = queryString;
    console.log(query);
    connection.query(query, function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            callback(rows);
        } else {
            console.log('Error while performing Query.');
            console.log(err.code);
            console.log(err.message);
        }
    });
    connection.end();
};

module.exports = router;