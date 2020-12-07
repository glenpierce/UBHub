var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var config = require('../config.js');

router.get('/', function(req, res, next){
    res.render('createUser', {errorFromServer:false});
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
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            if(rows.size) {
                res.render('createUser', {errorFromServer: true});
            } else {
                createUser(req, res);
            }
        } else {
            console.log('Error while performing Query.');
            res.render('createUser', {errorFromServer: true});
        }
    });

    connection.end();
}

function createUser(req, res) {
    console.log("creating user");

    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    const salt = bcrypt.genSaltSync(10) + req.body.username.toLowerCase() + config.salt;
    const hash = bcrypt.hashSync(req.body.password, salt);

    connection.connect();

    connection.query('CALL createUser("' + req.body.username + '", "' + hash + '", "' + req.body.alias + '", "' + req.body.userAddress + '")', function(err, rows, fields){
        if (!err) {
            console.log('The user db has created a user: ', JSON.stringify(rows));
            res.redirect('login');
        } else {
            console.log('Error while performing Query.');
            res.render('createUser', {errorFromServer: true});
        }
    });

    connection.end();
}

module.exports = router;