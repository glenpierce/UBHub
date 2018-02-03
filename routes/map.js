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
    query = 'SELECT * from locations limit 500';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            mapData = rows;
            console.log(JSON.stringify(mapData));
            mapSummary = getSummary(mapData);
            console.log(mapSummary);
            if (req.session && req.session.user) {
                res.render('map', {
                  mapFilterParameters: mapFilterParameters,
                  mapData:JSON.stringify(mapData),
                  mapSummary: mapSummary,
                  username: req.session.user});
            } else {
                res.render('map', {
                  mapFilterParameters: mapFilterParameters,
                  mapData:JSON.stringify(mapData),
                  mapSummary: mapSummary,
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

function getSummary(data){
  var summary = {};
  summary.total = data.length;

  summary.municipalities = data.filter((x) => {
    return (x.scale == "municipality");
  }).length;

  summary.districts = data.filter((x) => {
    return (x.scale == "district/county");
  }).length;

  summary.campuses = data.filter((x) => {
    return (x.scale == "campus");
  }).length;


  return summary;
}

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
];

var mapIndices = [
    {
        name: "Local Action for Biodiversity",
        id: "labJoined",
        image: "LabProgrammeLogo.jpg"
    }
];

var mapFilterParameters = [
  {
    name: "Scale",
    id: "scale",
    options: ['global/universal', 'international', 'city-state/autonomous city', 'subnational/provincial', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution'],
    type: "select"
  },
  {
    name: "Population",
    id: "population",
    options: ['<20,000', '20,000-50,000', '50,000-100,000', '100,000-200,000', '200,000-500,000', '500,000-1,000,000', '1,000,000-2,000,000', '2,000,000-5,000,000', '>5,000,000'],
    type: "range"
  },
  {
    name: "Biodiversity Activity",
    id: "activity",
    options: [mapActivities[0].name, mapActivities[1].name, mapActivities[2].name, mapActivities[3].name],
    type: "select"
  },
  {
    name: "Land Area (km\u00B2)",
    id: "area_km2",
    options: ['<50', '50-200', '200-500', '500-1,000', '1,000-2,000', '2,000-10,000', '10,000-20,000', '>20,000'],
    type: "range"
  },
  {
    name: "Density (People/km\u00B2)",
    id: "density_km2",
    options: ['<300', '300-1,000', '1,000-4,000', '4,000-10,000', '>10,000'],
    type: "range"
  },
  {
    name: "Program or Index",
    id: "programIndex",
    options: [mapIndices[0].name],
    type: "select"
  }];

module.exports = router;
