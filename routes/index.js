var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

/* GET home page. */
router.get('/', function(req, res, next) {
    // if(req.session && req.session.user)
    //     return res.redirect('indicators');
    // else
        res.render('index');
});

router.get('/index', function(req, res, next) {
    res.render('index');
});

router.post('/', function(req, res, next) {
    userEmail = "";
    if(req.body.email){
        if(req.body.email.toString() === req.body["verify-email"].toString()){
            userEmail = req.body.email.toString();
            addEmailToList(userEmail);
        }
    }
    res.render('index');
});

function addEmailToList(email){
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

connection.connect();

connection.query('CALL addEmail("' + email + '")', function(err, rows, fields) {
    if (!err)
        console.log('Email added');
    else
        console.log('Error while adding email.');
});

connection.end();
}

module.exports = router;
