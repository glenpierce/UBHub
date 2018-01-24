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

router.get('/', function(req, res, next) {
    var mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from locations limit 100';
    console.log(query);
    console.log(JSON.stringify(mapFilterParameters));
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            if (req.session && req.session.user) {
                res.render('map', {
                  mapFilterParameters: mapFilterParameters,
                  mapData:JSON.stringify(mapData),
                  username: req.session.user});
            } else {
                res.render('map', {
                  mapFilterParameters: mapFilterParameters,
                  mapData:JSON.stringify(mapData),
                  username: null});
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

var mapFilterParameters = [
  {
    name: "Scale",
    id: "scale",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution']
  },
  {
    name: "Population",
    id: "population",
    options: ['<20000', '20000–50000', '50000–100000', '100000–200000', '200000–500000', '500000–1000000', '1000000–2000000', '2000000–5000000', '>5000000']
  },
  {
    name: "Activity",
    id: "activity",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution']
  },
  {
    name: "Area",
    id: "area",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution']
  },
  {
    name: "Density",
    id: "density",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution']
  },
  {
    name: "Program or Index",
    id: "programIndex",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution']
  }];

var mapActivities = [
  {
    name: "Biodiversity Website",
    id: "biodiversityWebsite"
  },
  {
    name: "Biodiversity Mainstreaming",
    id: "biodiversityMainstreaming"
  },
  {
    name: "Biodiversity Plan",
    id: "biodiversityPlan"
  },
  {
    name: "Biodiversity Report",
    id: "biodiversityReport"
  }
]

var mapIndices = [
  {
    name: "Local Action for Biodiversity",
    id: "labJoined",
    image: "LabProgrammeLogo.jpg"
  }
]

module.exports = router;
