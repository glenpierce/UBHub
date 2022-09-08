var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var session = require('client-sessions');
var path = require("path");

var app = express();

var environment = require('../environment.js');

app.use(session({
    cookieName: 'session',
    secret: environment.secret,
    cookie: {
        maxAge: new Date(Date.now() + (environment.expires))
    }
}));

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', function(req, res){

    console.log('login request received');

    var connection = mysql.createConnection({
        host: environment.rdsHost,
        user: environment.rdsUser,
        password: environment.rdsPassword,
        database: environment.rdsDatabase
    });

    connection.connect();

    connection.query('CALL login("' + req.body.username + '")', function(err, rows, fields) {
        if (!err && rows[0][0] != undefined) {
            // console.log(rows);
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, response) {
                // console.log(response);
                if(response){
                    req.session.user = req.body.username;
                    return res.send('/dashboard');
                } else {
                    return res.send('/login');
                }
            });
        } else {
            console.log('Error while performing Query.');
            return res.send('/login');
        }
    });

    connection.end();
});

module.exports = router;
