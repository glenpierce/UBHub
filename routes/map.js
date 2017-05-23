var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var http = require('http');
var https = require('https');
var mysql = require('mysql');

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

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

router.get('/', function(req, res, next) {
    var mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
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
    // update();
});

function update(){
    mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations where lat is null';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            rows.forEach(function (element){
                console.log("updating id=" + element.id);
                getLatLong(element.address, element.id);
            });
        } else {
            console.log('Error while performing Query.');
        }
    });
    connection.end();
}

router.post('/', function (req, res) {
    console.log(req.body);
    // connection = mysql.createConnection({
    //     host: config.rdsHost,
    //     user: config.rdsUser,
    //     password: config.rdsPassword,
    //     database: config.rdsDatabase
    // });
    //
    // connection.connect();
    // // query = 'CALL createLocationSimple("' + req.body.location + '", "' + req.body.title + '")';
    // query = getCreateLocationQuery();
    // console.log(query);
    // connection.query(query, function(err, rows, fields) {
    //     if (!err) {
    //        getLatLong(req.body.location, rows[0][0].id);
    //     } else {
    //         console.log(err);
    //     }
    // });
    // connection.end();
    res.redirect('back');
});

// function getLocationQuery(){
//     query = 'CALL createLocation("' +
//         address + '", "' +
//         title + '", "' +
//         country + '", "' +
//         scale + '", "' +
//         intplan_year + '", "' +
//         intplan_title + '", "' +
//         intplan_url + '", "' +
//         plan1_year + '", "' +
//         plan1_title + '", "' +
//         plan1_url + '", "' +
//         plan2_year + '", "' +
//         plan2_title + '", "' +
//         plan2_url + '", "' +
//         report_year + '", "' +
//         report_title + '", "' +
//         report_url + '", "' +
//         EF_year + '", "' +
//         EF_data_hapercap + '", "' +
//         EF_link + '", "' +
//         LAB_joined + '", "' +
//         Durban_commitment + '", "' +
//         LAB_CEPA + '", "' +
//         LAB_URBIS + '", "' +
//         LAB_wetlands + '", "' +
//         Biophilic_cities + '", "' +
//         European_Green_Capital_award + '", "' +
//         European_capital_biodiversity + '", "' +
//         biodiversity_url + '", "' +
//         wetollllland_profile + '", "' +
//         wetland_report + '", "' +
//         SI_status + '", "' +
//         MAB_urban + '", "' +
//         IUCN_protected_area + '", "' +
//         grab_partner + '", "' +
//         extra1_title + '", "' +
//         extra1_url + '", "' +
//         extra2_title + '", "' +
//         extra2_link + '", "' +
//         map + '", "' +
//         map_link + '", "' +
//         data_portal + '", "' +
//         data_link + '", "' +
//         contact_name + '", "' +
//         contact_title + '", "' +
//         contact_email + '", "' +
//         rainfall + '", "' +
//         elevation_m + '", "' +
//         temperature + '", "' +
//         coastal + '", "' +
//         CBI_coalition + '", "' +
//         update_date + '", "' +
//         update_by + '", "' +
//         update_verified + '", "' +
//         population + '", "' +
//         density_km2 + '", "' +
//         area_km2 + '", "' +
//         area_h + '", "' +
//         '")';
//     return query;
// }

module.exports = router;