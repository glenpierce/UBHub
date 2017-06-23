var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var config = require('../config.js');

var id;

router.get('/', function(req, res, next) {
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    id = req.query.id;

    connection.connect();
    query = 'CALL getUploadByUserById("' + req.session.user + '", "' + id + '")';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            // console.log({data:rows[0]});
            data = rows[0][0];
            stringFromServer = JSON.stringify(rows[0][0]);
            console.log(data);
            res.render('editUpload', {fromServer:data, stringFromServer:stringFromServer, username: req.session.user});
        } else {
            console.log(err);
        }
    });
    connection.end();
});

router.post('/', function(req, res){

    console.log("edit upload");

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    query = 'CALL getUploadById("' + id + '")';
    query = 'SELECT * FROM locations WHERE id = ' + id + ';';
    console.log(query);
    connection.query(query, function(err, rows, fields){
        if (!err) {
            if(req.body.username === rows.user){
                updateUpload(req, res);
                console.log("correct user");
            } else {
                res.redirect('login');
                console.log("wrong user");
            }

        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();
});

function updateUpload(req, res){
    var query = 'CALL updateUpload("' + req.body.locationId + '", "' + req.body.location + '", "' + req.body.title + '", "' + req.session.user + '", "' + req.body.location + '", "' + req.body.scale + '", \'' + JSON.stringify(req.body) + '\')';
    query = 'UPDATE locations SET myJson = \'' + JSON.stringify(req.body) + '\' WHERE id = ' + id + ';';
    console.log(query);

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query(query, function(err, rows, fields){
        if (!err) {
            res.redirect('yourUploads');
        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();
}

module.exports = router;