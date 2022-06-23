var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var config = require('../config.js');

router.get('/', function(req, res, next) {
    console.log("get login");
    res.render('login');
});

module.exports = router;


//todo: fix mapping of uploads to my uploads and map
//todo: allow editing of an upload
//todo: increase information capture from email signup

//todo: logout
//todo: make maps conform to spec in pptx doc
//todo: fix recaptcha on create user