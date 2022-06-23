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
        res.render('index', {username: req.session.user});
});

router.post('/', function(req, res, next) {
    userEmail = "";
    if(req.body.email){
        if(req.body.email.toString() === req.body['verify-email'].toString()){
            var string = "firstName: " + req.body.nameFirst + ", " + "lastName: " + req.body.nameLast + ", " + "Org: " + req.body.organization + ", " + "Email: " + req.body.email;
            sendRecaptchaToGoogle(req.body['g-recaptcha-response'], string);
            res.render('index', {username: req.session.user});
        }
    }
});

function sendRecaptchaToGoogle(response, email){
    request.post("https://www.google.com/recaptcha/api/siteverify?secret=" + config.reCAPTCHASecret + "&response=" + response,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
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