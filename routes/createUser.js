var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var config = require('../config.js');

router.get('/', function(req, res, next){
    res.render('createUser');
});

router.post('/', function(req, res){
    isUserNameUnique(req, res);
});

function isUserNameUnique(req, res){
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = "select * from users where email = '" + req.body.alias + "';";
    console.log(query);
    connection.query(query, function(err, rows, fields){
        if (!err) {
            if(rows.size)
                createUser(req, res);
            else
                res.render('createUser');
        } else {
            console.log('Error while performing Query.');
            res.render('createUser');
        }
    });

    connection.end();
}

function createUser(req, res) {
    console.log("creating user");

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    var salt = bcrypt.genSaltSync(10) + req.body.username.toLowerCase() + config.salt;
    var hash = bcrypt.hashSync(req.body.password, salt);

    connection.connect();

    connection.query('CALL createUser("' + req.body.username + '", "' + hash + '", "' + req.body.alias + '", "' + req.body.userAddress + '")', function(err, rows, fields){
        if (!err) {
            console.log('The user db has created a user: ', JSON.stringify(rows));

        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();

    res.redirect('login');
}

module.exports = router;