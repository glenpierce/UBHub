var express = require('express');
var mysql = require('mysql');
var router = express.Router();
var path = require("path");
var request = require('request');
var https = require('https');
var config = require('../config.js');
var session = require('client-sessions');


router.get('/', function(req, res, next) {
    res.render('createNewUpload');
});

router.post('/', function (req, res) {
    console.log(req.body);
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'CALL createLocationSimple("' + req.body.location + '", "' + req.body.title + '", \'' + JSON.stringify(req.body) + '\')';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            getLatLong(req.body.location, rows[0][0].id);
        } else {
            console.log(err);
        }
    });
    connection.end();
    res.redirect('yourUploads');
});

function getLatLong(address, id){
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
                console.log(result);
                if(result.results[0]){
                    lat = result.results[0].geometry.location.lat;
                    lng = result.results[0].geometry.location.lng;
                    console.log(lat);
                    console.log(lng);
                    updateLocation(id, lat, lng);
                } else {
                    console.log(id + "no good");
                }
            });
        });
        req.end();
    } else {
        console.log("missing address");
    }
}

function updateLocation(id, lat, lng){
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'CALL updateLocation(' + id + ', "' + lat + '", "' + lng + '")';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            console.log("location updated");
        } else {
            console.log(err);
        }
    });
    connection.end();
}

module.exports = router;