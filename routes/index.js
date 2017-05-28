var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/index', function(req, res, next) {
    res.render('index');
});

router.post('/', function(req, res, next) {
    console.log(req);
});

module.exports = router;
