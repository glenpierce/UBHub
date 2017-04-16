var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");

/* GET home page. */
router.get('/', function(req, res, next) {

    res.render('index',{title:"The thing I'm working on"});
});

module.exports = router;
