import express from 'express';

const router = express.Router();
import { pool } from '../ConnectionPool.js';

router.get('/', async function (req, res, next) {
  console.log("Rendering map page");
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Acquired connection for map page");

    const locationsQuery = 'SELECT * from locations limit 2000';
    const mapData = await getMapLocations(connection, locationsQuery);

    const mapSummary = getSummary(mapData);
    console.log("mapSummary: ", mapSummary);

    const buttonsQuery = 'SELECT * from mapButtons';
    const buttons = await getMapData(connection, buttonsQuery);
    console.log("Selected buttons for map page");

    const mapButtons = categorizeButtons(buttons);

    res.render('map', {
      mapFilterParameters: mapFilterParameters,
      mapData: JSON.stringify(mapData),
      mapSummary: mapSummary,
      mapButtons: mapButtons,
      username: req.session && req.session.user ? req.session.user : null
    });

  } catch (error) {
    console.error("failed to load map page:", error);
    res.render('map', {
      mapFilterParameters: mapFilterParameters,
      mapData: {},
      mapSummary: {},
      mapButtons: {},
      username: null
    });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error("Error releasing connection:", releaseErr);
      }
    }
  }
});

router.post('/tableData', async function (req, res, next) {
  const page = req.body.page == null ? 1 : req.body.page;
  const filters = req.body.filters || [];
  const limit = 10;
  const query = buildLocationsQuery(filters, page, limit);

  let connection;
  try {
    connection = await pool.getConnection();
    const rows = await connection.query(query);

    if (rows && rows.length > 0) {
      const attachedRows = await attachProgramsToGivenInstitutions(connection, rows);

      let string = "";
      for (let i = 0; i < attachedRows.length; i++) {
        string += `<tr>`;
        string += `<td class="mvTitle">${attachedRows[i].inst_title}</td>`;
        string += `<td>${attachedRows[i].country}</td>`;
        string += `<td>${attachedRows[i].scale}</td>`;
        string += `<td class="mvPrograms">${outputProgramsAndActivities(attachedRows[i])}</td>`;
        string += `</tr>`;
      }

      res.send(string);
    } else if (rows && rows.length === 0) {
      res.send("<p>No data for given parameters.</p>");
    } else {
      res.send("<p>Processing...</p>");
    }
  } catch (err) {
    console.error("tableData error:", err);
    res.send("<p>No data for given parameters.</p>");
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
  }
});

router.post('/resultCounts', async function (req, res, next) {
  const filters = req.body.filters || [];
  const query = buildLocationsQuery(filters, -1, -1);

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query);

    let counts;
    if (rows) {
      counts = {
        total: rows.length,
        municipalities: rows.filter(location => location.scale == "municipality").length,
        districts: rows.filter(location => location.scale == "district/county").length,
        campuses: rows.filter(location => location.scale == "campus").length
      };
    } else {
      counts = {};
    }

    res.send(JSON.stringify(counts));
  } catch (err) {
    console.error("resultCounts error:", err);
    res.send(JSON.stringify({}));
  } finally {
    if (connection) {
      try { connection.release(); } catch (releaseErr) { console.error("Error releasing connection:", releaseErr); }
    }
  }
});

router.post('/getProgramMembers', async function (req, res, next) {
  const programName = req.body.programName;
  const query = "SELECT * FROM participation WHERE `part_name` = '" + programName + "'";

  let connection;
  try {
    connection = await pool.getConnection();
    const rows = await connection.query(query);
    res.send(JSON.stringify(rows || []));
  } catch (err) {
    console.error("getProgramMembers error:", err);
    res.send(JSON.stringify([]));
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
  }
});

function buildLocationsQuery(filters, page, limit) {
  //PICK FIELDS
  let query = `SELECT * from locations as l `;
  let useWhere = false;

  let whereClause = "";
  let joinClause = "";
  let firstWhere = true;

  //DEAL WITH FILTERS
  if (filters.length > 0) {

    //do WHERE filters first
    for (let i = 0; i < filters.length; i++) {

      switch (filters[i].type) {
        case("select"):
          if (!firstWhere){
            whereClause += " AND ";
          }
          if(filters[i].val == "all") {
            whereClause += ` l.${filters[i].key} IS NOT NULL`;
          } else {
            whereClause += ` l.${filters[i].key}="${filters[i].val}"`;
          }
          firstWhere = false;
          break;

        case("range"):
          if (!firstWhere){
            whereClause += " AND ";
          }
          whereClause += ` l.${filters[i].key} BETWEEN ${filters[i].lower} AND ${filters[i].upper}`;
          firstWhere = false;
          break;

        case("nullable"):
          //TODO: fix this when new data is in db
          whereClause += " true = true ";
          useWhere = true;
          break;
      }
    }

    //then do JOINs:
    for (let i = 0; i < filters.length; i++) {
      switch (filters[i].type) {
        case("document"):
          joinClause += ` INNER JOIN (select inst_id, doc_type from documents d where d.doc_type = "${filters[i].val}" group by inst_id) as dq on dq.inst_id = l.id `;
          break;
        case("program"):
          joinClause += ` INNER JOIN (select inst_id, part_name from participation p where p.part_name = "${filters[i].val}" group by inst_id) as pq on pq.inst_id = l.id `;
          break;
      }
    }

    if (whereClause != "") {
      whereClause = " WHERE " + whereClause;
    }

    query += joinClause + " " + whereClause;

  }

  if(page > -1 && limit > -1){
    query += ` limit ${limit} offset ${limit * (page - 1)}`;
  }

  console.log(query);
  return query;
}

async function getMapData(connection, query) {
  console.log("getMapData", query);
  if (!connection) {
    throw new Error("No DB connection provided to getMapData");
  }
  const rows = await connection.query(query);
  return rows;
}

async function attachProgramsToGivenInstitutions(connection, locations) {
  const institutionIds = locations
    .map((location) => location.id)
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map((id) => (typeof id === 'number' ? id : Number(id)))
    .filter((id) => Number.isFinite(id));
  const institutionIdsString = institutionIds.join(", ");

  let partQuery = "SELECT * from participation";
  if (institutionIdsString.length > 0) {
    partQuery += " WHERE inst_id in (" + institutionIdsString + ")";
  } else {
    partQuery += ";";
  }

  try {
    const partData = await getMapData(connection, partQuery);
    locations = mapParticipitationDataToLocations(partData, locations);

    let documentQuery = "SELECT * FROM documents";
    if (institutionIdsString.length > 0) {
      documentQuery += " WHERE inst_id in (" + institutionIdsString + ")";
    } else {
      documentQuery += ";";
    }

    const documentData = await getMapData(connection, documentQuery);
    locations = mapDocumentDataToLocations(documentData, locations);

    return locations;
  } catch (error) {
    console.error("attachProgramsToGivenInstitutions error:", error);
    throw error;
  }
}

async function getMapLocations(connection, query) {
  try {
    const locations = await getMapData(connection, query);

    const partQueryIds = locations
      .map((location) => location.id)
      .filter((id) => id !== null && id !== undefined && id !== '')
      .map((id) => (typeof id === 'number' ? id : Number(id)))
      .filter((id) => Number.isFinite(id));
    const partQueryStrings = partQueryIds.join(", ");

    let participationQuery = "SELECT * FROM participation";
    if (partQueryStrings.length > 0) {
      participationQuery += " WHERE inst_id in (" + partQueryStrings + ")";
    } else {
      participationQuery += ";";
    }

    const participationData = await getMapData(connection, participationQuery);
    let locationsMappedParticipationData = mapParticipitationDataToLocations(participationData, locations);

    let documentQuery = "SELECT * FROM documents";
    if (partQueryStrings.length > 0) {
      documentQuery += " WHERE inst_id in (" + partQueryStrings + ")";
    } else {
      documentQuery += ";";
    }

    const documentData = await getMapData(connection, documentQuery);
    const locationsMappedParticipationMappedDocumentData = mapDocumentDataToLocations(documentData, locationsMappedParticipationData);

    return locationsMappedParticipationMappedDocumentData;
  } catch (err) {
    console.error("getMapLocations error:", err);
    throw err;
  }
}

function mapParticipitationDataToLocations(participationData, locations) {
  //TODO: optimize this
  participationData.forEach((part) => {
    let found = false;
    let i = 0;

    while (!found && i < locations.length) {

      if (locations[i].id == part.inst_id) {
        locations[i] = attachParticipation(locations[i], part);
        found = true;
      }
      i++;
    }

  });

  return locations;
}

function mapDocumentDataToLocations(documentData, locations) {
  documentData.forEach((document) => {
    let found = false;
    let i = 0;

    while (!found && i < locations.length) {

      if (locations[i].id == document.inst_id) {
        locations[i] = attachDocument(locations[i], document);
        found = true;
      }
      i++;
    }

  });

  return locations;
}

function attachParticipation(location, part) {

  if (location.participation == undefined) {
    location.participation = [part];
  } else {
    location.participation.push(part);
  }

  return location;
}

function attachDocument(location, document) {
  //location.participation = [part];

  if (location.document == undefined) {
    location.document = [document];
  } else {
    location.document.push(document);
  }

  return location;
}

function categorizeButtons(buttons) {
  let mapButtonCategories = [];
  for (let i = 0; i < buttons.length; i++) {

    let found = false;
    let j = 0;

    while (j < mapButtonCategories.length && !found) {
      if (buttons[i].button_category == mapButtonCategories[j].categoryName) {
        mapButtonCategories[j].buttons.push(buttons[i]);
        found = true;
      }
      j++
    }

    if (!found) {
      const newCategory = {
        categoryName: buttons[i].button_category,
        buttons: [buttons[i]]
      };
      mapButtonCategories.push(newCategory);
    }
  }

  return mapButtonCategories;
}

function outputProgramsAndActivities(entry) {
  let contentString = "";

  if (entry.biodiversity_url != undefined) {
    contentString += `<a href="${entry.biodiversity_url}" target="_blank"><p>Biodiversity Website</p></a>`;
  }

  if (entry.participation != undefined) {
    contentString += '<h4>Programs</h4>';
    entry.participation.forEach((part) => {
      contentString += '<p>';
      if (part.part_year != null) {
        contentString += part.part_year + " ";
      }
      contentString += '<a href="' + part.part_link + '" target="_blank">' + part.part_name + '</a>';

      if (part.part_level != null) {
        contentString += ' (' + part.part_level + ')';
      }
      contentString += '</p>';
    });
  }

  if (entry.document != undefined) {
    contentString += '<h4>Activities</h4>';
    entry.document.forEach((document) => {
      contentString += '<p>';
      if (document.doc_year != null) {
        contentString += document.doc_year + " ";
      }
      if (document.doc_url != null) {
        if (document.doc_url.startsWith('/pdf')) {
          contentString += '<a href="' + 'https://s3.ca-central-1.amazonaws.com/ubhubpdfstorage/public' + document.doc_url + '" target="_blank">' + document.doc_title + '</a>';
        } else {
          contentString += '<a href="' + document.doc_url + '" target="_blank">' + document.doc_title + '</a>';
        }
      }

      if (document.doc_type != null) {
        contentString += ' (' + document.doc_type + ')';
      }
      contentString += '</p>';
    });
  }

  return contentString;
}


function getSummary(data) {
  let summary = {};
  summary.total = data.length;

  summary.municipalities = data.filter((location) => {
    return (location.scale == "municipality");
  }).length;

  summary.districts = data.filter((location) => {
    return (location.scale == "district/county");
  }).length;

  summary.campuses = data.filter((location) => {
    return (location.scale == "campus");
  }).length;


  return summary;
}

const mapActivities = [
  {name: "Biodiversity Data Portal"},
  {name: "Biodiversity Online Map"},
  {name: "Biodiversity Plan"},
  {name: "Biodiversity Report"},
  {name: "Comprehensive Plan"},
  {name: "Developer Guide"},
  {name: "Engagement Activity"},
  {name: "Habitat Plan"},
  {name: "Informational Handout"},
  {name: "Local Program"},
  {name: "Public Policy"},
  {name: "Species Plan"},
  {name: "Supporting Document"},
  {name: "Sustainability Plan"},
  {name: "Urban Forest Plan"},
  {name: "Water Management Plan"}
];

const mapIndices = [
  {name: "Biocapacity"},
  {name: "Biodiversity Communication, Education and Public Awareness (CEPA)"},
  {name: "Biophilic Cities"},
  {name: "Capitale Francaise de la Biodiversite"},
  {name: "Community Wildlife Habitat"},
  {name: "Durban Commitment"},
  {name: "European Capitals of Biodiversity"},
  {name: "European Green Capital Award"},
  {name: "Ecological Footprint"},
  {name: "Green and Blue Space Adaptation for Urban Areas and Eco Towns (GRaBS)"},
  {name: "INTERACT-Bio"},
  {name: "LAB Pioneer Programme"},
  {
    name: "LAB Wetlands",
    id: "LAB Wetlands",
    image: "LabProgrammeLogo.jpg"
  },
  {name: "Mayors Monarch Pledge"},
  {name: "One Planet Living"},
  {name: "Singapore Index"},
  {name: "Urban Biosphere Reserves"},
  {name: "Urban Bird Treaty"},
  {name: "Urban Protected Area"},
  {name: "Urban Wildlife Refuge"},
  {name: "URBIS"},
  {name: "WILD Cities"},
  {name: "City Nature Challenge"},
  {name: "Treepedia"},
  {name: "Cities With Nature"},
  {name: "UNA Rivers for Life"}
];

const mapFilterParameters = [
  {
    name: "Scale",
    id: "scale",
    options: ['international', 'national', 'city-state/autonomous city', 'subnational/provincial', 'watershed', 'district/county', 'metro region', 'municipality', 'community', 'urban reserve', 'campus', 'institution'],
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
  },
  {
    name: "Biodiversity Hotspot",
    id: "hotspot",
    options: ['all', 'Atlantic Forest', 'California Floristic Province', 'Cape Floristic Region', 'Caribbean Islands', 'Chilean Winter Rainfall and Valdivian Forests', 'Coastal Forests of Eastern Africa', 'Caucasus', 'Cerrado', 'Eastern Afromontane', 'Forests of East Australia', 'Guinean Forests of West Africa', 'Indo-Burma', 'Irano-Anatolian', 'Himalaya', 'Japan', 'Madagascar and the Indian Ocean Islands', 'Maputaland-Pondoland-Albany', 'Mediterranean Basin', 'Mesoamerica', 'Mountains of Southwest China', 'New Zealand', 'North American Coastal Plain', 'Philippines', 'Polynesia-Micronesia', 'Southwest Australia', 'Sundaland', 'Tropical Andes', 'Western Ghats and Sri Lanka'],
    type: "select"
  },
  {
    name: "Biome (WWF)",
    id: "wwf_biome",
    options: ['Boreal Forests/Taiga', 'Deserts & Xeric Shrublands', 'Flooded Grasslands & Savannas', 'Mangroves', 'Mediterranean Forests, Woodlands & Scrub', 'Montane Grasslands & Shrublands', 'Temperate Broadleaf & Mixed Forests', 'Temperate Conifer Forests', 'Temperate Grasslands, Savannas & Shrublands', 'Tropical & Subtropical Grasslands, Savannas & Shrublands', 'Tropical & Subtropical Dry Broadleaf Forests', 'Tropical & Subtropical Moist Broadleaf Forests', 'Tundra'],
    type: "select"
  },
  {
    name: "Conservation Status (WWF)",
    id: "conservation_status_wwf",
    options: ['critical or endangered', 'vulnerable', 'relatively stable or intact'],
    type: "select"
  }];

export default router;
