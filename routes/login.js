var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

router.get('/', function(req, res, next) {
    console.log("get login");
    res.render('login');
});

module.exports = router;