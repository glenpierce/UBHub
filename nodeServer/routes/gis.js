var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var config = require('../config.js');

router.get('/', function(req, res, next) {
    // if (req.session.user) {
        res.render('gis', {username: req.session.user});
    // } else {
    //     res.writeHead(403, {'Content-Type': 'text/html'});
    //     res.write('response');
    //     res.end();
    // }
});


module.exports = router;