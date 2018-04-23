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


    getMapLocations(connection, locationsQuery)
    .then((mapData) => {
      mapSummary = getSummary(mapData);
      buttonsQuery = 'SELECT * from mapButtons';
      getMapData(connection, buttonsQuery)
      .then((buttons) => {
        var mapButtons = categorizeButtons(buttons);
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

    query+= "WHERE ";

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
          query+= " true = true ";
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

function getMapLocations(connection, query){
  return new Promise((resolve, reject) => {
    getMapData(connection, query)
    .then ((locations) => {

      var partQueryIds = locations.map((x) => {
        return x.id;
      });

      var partQueryStrings = partQueryIds.join(", ");


      var partQuery = "SELECT * FROM participation WHERE inst_id in (" + partQueryStrings + ")";

      getMapData(connection, partQuery)
      .then((partData => {
        locations = mapParticipitationDataToLocations(partData, locations);
      }))
      .then(() => {
          const documentQuery = "SELECT * FROM documents WHERE inst_id in (" + partQueryStrings + ")";
          getMapData(connection, documentQuery)
          .then((documentData) => locations = mapDocumentDataToLocations(documentData, locations))
          .then((() => resolve(locations)));
      })
    });
  });
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

function mapParticipitationDataToLocations(participationData, locations){
  //TODO: optimize this
  participationData.forEach((part) => {
    var found = false;
    var i = 0;

    while (!found && i < locations.length) {

      if(locations[i].id == part.inst_id) {
        locations[i] = attachParticipation(locations[i], part);
        found = true;
      }
      i++;
    }

  });

  return locations;
}

function mapDocumentDataToLocations(documentData, locations){
    documentData.forEach((document) => {
        var found = false;
        var i = 0;

        while (!found && i < locations.length) {

            if(locations[i].id == document.inst_id) {
                locations[i] = attachDocument(locations[i], document);
                found = true;
            }
            i++;
        }

    });

    return locations;
}

function attachParticipation(location, part) {
  //location.participation = [part];

  if(location.participation == undefined) {
    location.participation = [part];
  } else {
    location.participation.push(part);
  }

  return location;
}

function attachDocument(location, document) {
    //location.participation = [part];

    if(location.document == undefined) {
        location.document = [document];
    } else {
        location.document.push(document);
    }

    return location;
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
      };
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
        name: "Biodiversity Data Portal"
    },
    {
        name: "Biodiversity Online Map"
    },
    {
        name: "Biodiversity Plan"
    },
    {
        name: "Biodiversity Report"
    },
    {
        name: "Comprehensive Plan"
    },
    {
        name: "Developer Guide"
    },
    {
        name: "Engagement Activity"
    },
    {
        name: "Habitat Plan"
    },
    {
        name: "Informational Handout"
    },
    {
        name: "Local Program"
    },
    {
        name: "Public Policy"
    },
    {
        name: "Species Plan"
    },
    {
        name: "Supporting Document"
    },
    {
        name: "Sustainability Plan"
    },
    {
        name: "Urban Forest Plan"
    },
    {
        name: "Water Management Plan"
    }
];

var mapIndices = [
    {
        name: "Biocapacity"
    },
    {
        name: "Biodiversity Communication, Education and Public Awareness (CEPA)"
    },
    {
        name: "Biophilic Cities"
    },
    {
        name: "Capitale Francaise de la Biodiversite"
    },
    {
        name: "Community Wildlife Habitat"
    },
    {
        name: "Durban Commitment"
    },
    {
        name: "European Capitals of Biodiversity"
    },
    {
        name: "European Green Capital Award"
    },
    {
        name: "Footprint"
    },
    {
        name: "Green and Blue Space Adaptation for Urban Areas and Eco Towns (GRaBS)"
    },
    {
        name: "INTERACT-Bio"
    },
    {
        name: "LAB Wetlands",
        id: "LAB Wetlands",
        image: "LabProgrammeLogo.jpg"
    },
    {
        name: "Mayor's Monarch Pledge"
    },
    {
        name: "One Planet Living"
    },
    {
        name: "Pioneer Programme" //todo: rename Lab Pioneer Programme
    },
    {
        name: "Singapore Index"
    },
    {
        name: "Urban Biosphere Reserves"
    },
    {
        name: "Urban Bird Treaty"
    },
    {
        name: "Urban Protected Area"
    },
    {
        name: "Urban Wildlife Refuge"
    },
    {
        name: "URBIS"
    },
    {
        name: "WILD Cities"
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
    id: "doc_type",
    options: [mapActivities[0].name, mapActivities[1].name, mapActivities[2].name, mapActivities[3].name, mapActivities[4].name, mapActivities[5].name, mapActivities[6].name, mapActivities[7].name, mapActivities[8].name, mapActivities[9].name, mapActivities[10].name,
            mapActivities[11].name, mapActivities[12].name, mapActivities[13].name, mapActivities[14].name, mapActivities[15].name],
    type: "document"
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
    id: "part_name",
    options: [mapIndices[0].name, mapIndices[1].name, mapIndices[2].name, mapIndices[3].name, mapIndices[4].name, mapIndices[5].name, mapIndices[6].name, mapIndices[7].name, mapIndices[8].name, mapIndices[9].name, mapIndices[10].name,
            mapIndices[11].name, mapIndices[12].name, mapIndices[13].name, mapIndices[14].name, mapIndices[15].name, mapIndices[16].name, mapIndices[17].name, mapIndices[18].name, mapIndices[19].name, mapIndices[20].name,
            mapIndices[21].name],
    type: "program"
  }];

module.exports = router;
