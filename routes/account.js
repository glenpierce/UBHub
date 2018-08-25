const express = require('express');
const router = express.Router();
const path = require("path");
const request = require('request');
const pool = require('../ConnectionPool.js').pool;

router.get('/', function(req, res, next) {

    pool.getConnection(function(error, connection){
        const query = `Call getRepByUser('${req.session.user}')`;
        connection.query(query, function(err, rows, fields) {
            connection.release();
            if (!err) {
                const userRep = rows[0][0].totalScore;
                res.render('account', {userName: req.session.user, userRep: userRep});
            } else {
                // res.render('account', {userName: req.session.user, userRep: null});
                res.render('index', {username: req.session.user});
            }
        });
    });
});


module.exports = router;