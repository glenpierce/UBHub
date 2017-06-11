var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var config = require('../config.js');

router.get('/', function(req, res, next) {
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    var id = req.query.id;

    connection.connect();
    query = 'CALL getUploadByUserById("' + req.session.user + '", "' + id + '")';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            // console.log({data:rows[0]});
            data = JSON.stringify(rows[0][0]);
            console.log(data);
            res.render('editUpload', {fromServer:data, username: req.session.user});
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

    connection.query('CALL getLocation("' + req.body.locationId + '")', function(err, rows, fields){
        if (!err) {
            if(req.body.username == rows.user){
                data = JSON.stringify(rows[0]);
            } else {
                wrongUser = false;
            }

        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();

    if(wrongUser){
        res.redirect('login');
    } else {
        res.render('editUpload', {fromServer: data});
    }
});

module.exports = router;