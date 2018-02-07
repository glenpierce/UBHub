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

router.post('/', function(req, res, next) {
    console.log(req.body);
    userEmail = "";
    if(req.body.email){
        if(req.body.email.toString() === req.body['verify-email'].toString()){
            console.log(req.body);
            console.log(req.body['g-recaptcha-response']);
            sendRecaptchaToGoogle(req.body['g-recaptcha-response'], req.body.email);
            res.render('index');
        }
    }
});

function sendRecaptchaToGoogle(response, email){
    request.post("https://www.google.com/recaptcha/api/siteverify?secret=" + config.reCAPTCHASecret + "&response=" + response,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                console.log(body);
                if(body.success == true)
                    addEmailToList(email);
            }
        }
    );
}

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