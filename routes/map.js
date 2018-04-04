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
    //var mapData = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    locationsQuery = 'SELECT * from locations limit 1000';


    getMapData(connection, locationsQuery)
    .then((mapData) => {
      mapSummary = getSummary(mapData);
      buttonsQuery = 'SELECT * from mapButtons';
      getMapData(connection, buttonsQuery)
      .then((buttons) => {
        var mapButtons = categorizeButtons(buttons);
        console.log(JSON.stringify(mapButtons));
        if (req.session && req.session.user) {
            res.render('map', {
              mapFilterParameters: mapFilterParameters,
              mapData:JSON.stringify(mapData),
              mapSummary: mapSummary,
              mapButtons: mapButtons,
              username: req.session.user});
        } else {
            res.render('map', {
              mapFilterParameters: mapFilterParameters,
              mapData:JSON.stringify(mapData),
              mapSummary: mapSummary,
              mapButtons: mapButtons,
              username: null});
        }
        connection.end();
      })
    })
    .catch((err) =>{
      console.log(err);
      connection.end();
    })
});

router.get('/update', function(req, res, next) {
    // update();
});

router.post('/tableData', function(req, res, next){

  var mapData = "";
  var string = "";
  var page = req.body.page;
  var filters = req.body.filters;

  if(page == null){
    page = 1;
  }

  var limit = 10;

  var query = buildLocationsQuery(filters, page, limit);

  connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });

  connection.connect();
  console.log(query);

  connection.query(query, function(err, rows, fields) {
    //Output an appropriate tbody
    if(rows != undefined){
      for(i = 0; i < rows.length; i++){
        string += `<tr>`;
        string += `<td>${rows[i].title}</td>`;
        string += `<td>${rows[i].country}</td>`;
        string += `<td>${rows[i].scale}</td>`;
        string += `<td>${getPlan1Title(rows[i])}</td>`;
        string += `</tr>`;
      }
      res.send(string);
    } else {
      res.send("Processing....");
    }



  });
});

router.post('/resultCounts', function(req, res, next){
  var filters = req.body.filters;
  var query = buildLocationsQuery(filters, -1, -1);

  connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });

  connection.connect();

  connection.query(query, function(err, rows, fields) {
    var counts;
    if(rows != undefined){
      counts = {
        total: rows.length,
        municipalities: rows.filter(x => x.scale == "municipality").length,
        districts: rows.filter(x => x.scale == "district/county").length,
        campuses: rows.filter(x => x.scale == "campus").length
      }
    } else {
      counts = {};
    }

    res.send(JSON.stringify(counts));
  });
});

router.post('/getProgramMembers', function(req, res, next) {
  var programName = req.body.programName;
  var query = "SELECT * FROM participation WHERE `part_name` = '" + programName + "'";

  connection = mysql.createConnection({
      host: config.rdsHost,
      user: config.rdsUser,
      password: config.rdsPassword,
      database: config.rdsDatabase
  });

  connection.connect();

  connection.query(query, function(err, rows, fields) {
    var members = []
    if(rows != undefined){
      members = rows;
    }

    res.send(JSON.stringify(rows));
  });

});

function buildLocationsQuery(filters, page, limit){
  //PICK FIELDS
  var query = `SELECT * from locations `;

  //DEAL WITH FILTERS
  if(filters.length > 0){

    query+= "WHERE "

    for(i = 0; i < filters.length; i++){

      switch(filters[i].type){
        case("select"):
          query+= filters[i].key + "='" + filters[i].val + "' ";
          break;
        case("range"):
          query+= filters[i].key + " BETWEEN " + filters[i].lower + " AND " + filters[i].upper + " ";
          break;
        case("nullable"):
          //TODO: fix this when new data is in db
          query+= " true = true "
          break;


      }

      query += " AND ";


    }

    query = query.substr(0, query.length - 4);

  }

  if(page > -1 && limit > -1){
    query += `limit ${limit} offset ${limit * (page - 1)}`;
  }

  return query;
}


function getPlan1Title(location){
  if(location.plan1_title != null){
    return location.plan1_title;
  }
  return "";
}

function getMapData(connection, query){
  return new Promise((resolve, reject) => {
    connection.query(query, function(err, rows, fields) {
      if (!err) {
        resolve(rows);
      } else {
        reject(err);
      }
    })
  });
}

function categorizeButtons(buttons) {
  var mapButtonCategories = [];
  for (i = 0; i < buttons.length; i++) {

    var found = false;
    var j = 0;

    while (j < mapButtonCategories.length && !found) {
      if (buttons[i].button_category == mapButtonCategories[j].categoryName){
        mapButtonCategories[j].buttons.push(buttons[i]);
        found = true;
      }
      j++
    }

    if(!found) {
      var newCategory = {
        categoryName: buttons[i].button_category,
        buttons: [buttons[i]]
      }
      mapButtonCategories.push(newCategory);
    }
  }

  return mapButtonCategories;
}


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
        name: "Biodiversity in a Comprehensive Plan",
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
    type: "nullable"
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
    type: "nullable"
  }];

module.exports = router;
