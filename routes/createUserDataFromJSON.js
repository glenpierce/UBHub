var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

router.post('/', function(req, res){
    makeDbCallAsPromise("CALL getSelectedSiteByUserQuery('" + req.session.user + "');").then(
        (selectedSite) => {
            // console.log(req.body);
            data = JSON.stringify(req.body).replace(/'/g, '\\\'');
            data = data.replace(/https?\:\/\//gi, "");
            const queryString = "INSERT INTO userData (site, program, jsonData) VALUES ('" + selectedSite[0][0].id + "', '" + 1 + "', '" + data + "');";
            console.log(queryString);
            makeDbCallAsPromise(queryString);
        }
    );
});


makeDbCallAsPromise = function(queryString) {
    return new Promise((resolve, reject) => {
        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        query = queryString;
        console.log(query);
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log('Error while performing Query.');
                console.log(err.code);
                console.log(err.message);
                reject(err);
            }
        });
        connection.end();
    })
};

module.exports = router;