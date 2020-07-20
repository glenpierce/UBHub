const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const session = require('client-sessions');
const path = require("path");
const app = express();
const config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    expires: new Date(Date.now() + (config.expires))
}));

router.get('/', function(req, res, next) {
    res.render('createIndicator', {username:req.session.user});
});

router.post('/', function(req, res){
    console.log(req.body);
    if (true || req.session && req.session.user) {
        query = "CALL createIndicator('" + req.body.name + "', '" + req.session.user + "', '" + req.body.type + "');";

        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                res.status(200).json({indicatorName: rows[0][0].indicatorName, id: rows[0][0].id});
                res.end();
            } else {
                console.log('Error while performing Query.');
                console.log(query);
                console.log(err.code);
                console.log(err.message);
            }
        });
        connection.end();
    } else {
        console.log("not logged in");
    }
});

module.exports = router;