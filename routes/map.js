var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var http = require('http');
var https = require('https');

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

var getLatLong = function (address){
    if(address){
        var addressQueryString = address.replace(/\s+/g, "+");
        //https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs
        var options = {
            host: 'maps.googleapis.com',
            path: '/maps/api/geocode/json?address=' + addressQueryString + "&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs",
            //since we are listening on a custom port, we need to specify it by hand
            //port: '1337',
            method: 'GET'
            // useQuerystring: true,
            // qs: 'address=' + "1600+Amphitheatre+Parkway,+Mountain+View,+CA" + "&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs"
        };

        var req = https.request(options, function(response) {
            // console.log(response);
            var data = '';
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                var result = JSON.parse(data);
                lat = result.results[0].geometry.location.lat;
                lng = result.results[0].geometry.location.lng;
                console.log(lat);
                console.log(lng);
                createMarker("name", "address", lat, lng, "type");
            });
        });
        req.end();
    } else {
        console.log("missing address");
    }
};

var createMarker = function (name, address, lat, lng, type){
    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    var query = 'CALL createMarker("' + name + '", "' + address + '", "' + lat + '", "' + lng + '", "' + type + '")';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            console.log("marker created");
        } else {
            console.log(err);
        }
    });
    connection.end();
};

router.get('/', function(req, res, next) {
    var mapData = "";

    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    connection.query('SELECT * from markers', function(err, rows, fields) {
        if (!err) {
            // console.log('The user db contains: ', rows);
            mapData = rows;
            if (req.session && req.session.user) {
                res.render('map', {mapData:JSON.stringify(mapData)});
            } else {
                console.log("not logged in");
                req.session.reset();
                res.redirect('/index');
            }
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
});

router.get('/update', function(req, res, next) {
    var mapData = "";

    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    connection.query('SELECT * from locations where address="Monaco"', function(err, rows, fields) {
        if (!err) {
            mapData = rows;
                rows.forEach(function (element){
                    getLatLong(element.address);
                });
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
});

router.post('/', function (req, res) {
    console.log(req.body);
    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    connection.query('CALL createLocation("' + req.body.location + '", "' + req.body.title + '")', function(err, rows, fields) {
        if (!err) {
            console.log("location created");
            getLatLong(req.body.location);
        } else {
            console.log(err);
        }
    });
    connection.end();
    res.redirect('back');
});

module.exports = router;