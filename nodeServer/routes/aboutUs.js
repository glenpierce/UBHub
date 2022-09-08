var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var environment = require('../environment.js');

/* GET home page. */
router.get('/', function(req, res, next) {
    // if(req.session && req.session.user)
    //     return res.redirect('indicators');
    // else
        res.render('aboutUs', {username: req.session.user});
});


module.exports = router;