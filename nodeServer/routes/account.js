const express = require('express');
const router = express.Router();
const path = require("path");
const request = require('request');
const pool = require('../ConnectionPool.js').pool;
const bcrypt = require('bcryptjs');
const config = require('../config.js');

router.get('/', function(req, res, next) {

    if(req.session.user) {
        pool.getConnection(function (error, connection) {
            const query = `Call getRepByUser('${req.session.user}')`;
            connection.query(query, function (err, rows, fields) {
                connection.release();
                if (!err) {
                    const userRep = rows[0][0].totalScore;
                    res.render('account', {username: req.session.user, userRep: userRep});
                } else {
                    res.render('home', {username: req.session.user});
                }
            });
        });
    } else {
        req.session.reset();
        res.render('home');
    }
});

router.post('/', function(req, res) {

    console.log("received change password post");
    console.log(req.body);

    pool.getConnection(function (error, connection) {
        connection.query('CALL login("' + req.session.user + '")', function (err, rows, fields) {
            connection.release();
            if (!err && rows[0][0] != undefined) {
                bcrypt.compare(req.body.oldPassword, rows[0][0].hashedPassword, function (err, response) {
                    if (response) {
                        var salt = bcrypt.genSaltSync(10) + req.session.user.toLowerCase() + config.salt;
                        var hash = bcrypt.hashSync(req.body.newPassword, salt);

                        const query = "update users set hashedPassword = \"" + hash + "\" where email = \"" + req.session.user + "\";";

                        console.log(query);

                        pool.getConnection(function (error, connection) {
                            connection.query(query, function (err, rows, fields) {
                                connection.release();
                                res.send(true);
                            });
                        });
                    } else {
                        return res.send(false);
                    }
                });
            } else {
                console.log('Error while performing Query.');
                return res.send(false);
            }
        });
    });
});

router.get('/logout', function (req, res, next) {
    req.session.reset();
    res.render('home');
});

module.exports = router;