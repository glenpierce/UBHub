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
    console.log("update available");
    res.redirect('/');
});

router.get('/update', function(req, res, next) {
    update();
    res.redirect('/');
});

function update(){

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword
        //database: config.rdsDatabase //we have not yet created the database schema, so trying to connect to a schema will not work
    });

    connection.connect();

    var query = [];

    var createDb = "create database ubhub;";
    query.push(createDb);

    var useDb = "use ubhub;";
    query.push(useDb);

    createUsersTable =
        "create table users(" +
            "email VARCHAR(254) NOT NULL," +
            "userAddress VARCHAR(2000)," +
            "hashedPassword CHAR(254) not null," +
            "alias VARCHAR(254) NOT NULL," +
            "PRIMARY KEY (email)," +
            "UNIQUE INDEX (email)" +
            ");";
    query.push(createUsersTable);

    var emails =
        "CREATE TABLE emails (" +
            "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
            "`email` VARCHAR(2048) CHARACTER SET utf8" +
        ");";
    query.push(emails);

    var createLocationsTable =
        "CREATE TABLE locations (" +
            "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
            "`address` VARCHAR(204) CHARACTER SET utf8," +
            "`lat` FLOAT( 10, 6 )," +
            "`lng` FLOAT( 10, 6 )," +
            "`title` VARCHAR(57) CHARACTER SET utf8," +
            "`country` VARCHAR(51) CHARACTER SET utf8," +
            "`scale` VARCHAR(51) CHARACTER SET utf8," +
            "`intplan_year` INT," +
            "`intplan_title` VARCHAR(102) CHARACTER SET utf8," +
            "`intplan_url` VARCHAR(459) CHARACTER SET utf8," +
            "`plan1_year` VARCHAR(19) CHARACTER SET utf8," +
            "`plan1_title` VARCHAR(108) CHARACTER SET utf8," +
            "`plan1_url` VARCHAR(459) CHARACTER SET utf8," +
            "`plan2_year` VARCHAR(11) CHARACTER SET utf8," +
            "`plan2_title` VARCHAR(102) CHARACTER SET utf8," +
            "`plan2_url` VARCHAR(459) CHARACTER SET utf8," +
            "`report_year` INT," +
            "`report_title` VARCHAR(102) CHARACTER SET utf8," +
            "`report_url` VARCHAR(459) CHARACTER SET utf8," +
            "`EF_year` VARCHAR(10) CHARACTER SET utf8," +
            "`EF_data_ghapercap` NUMERIC(5, 3)," +
            "`EF_link` VARCHAR(459) CHARACTER SET utf8," +
            "`LAB_joined` VARCHAR(102) CHARACTER SET utf8," +
            "`Durban_commitment` VARCHAR(102) CHARACTER SET utf8," +
            "`LAB_CEPA` VARCHAR(102) CHARACTER SET utf8," +
            "`LAB_URBIS` VARCHAR(102) CHARACTER SET utf8," +
            "`LAB_wetlands` VARCHAR(102) CHARACTER SET utf8," +
            "`Biophilic_cities` VARCHAR(102) CHARACTER SET utf8," +
            "`European_Green_Capital_award` INT," +
            "`European_capital_biodiversity` INT," +
            "`biodiversity_url` VARCHAR(459) CHARACTER SET utf8," +
            "`wetland_profile` VARCHAR(102) CHARACTER SET utf8," +
            "`wetland_report` VARCHAR(102) CHARACTER SET utf8," +
            "`SI_status` VARCHAR(102) CHARACTER SET utf8," +
            "`MAB_urban` INT," +
            "`IUCN_protected_area` VARCHAR(102) CHARACTER SET utf8," +
            "`grab_partner` VARCHAR(102) CHARACTER SET utf8," +
            "`extra1_title` VARCHAR(102) CHARACTER SET utf8," +
            "`extra1_url` VARCHAR(459) CHARACTER SET utf8," +
            "`extra2_title` VARCHAR(102) CHARACTER SET utf8," +
            "`extra2_link` VARCHAR(459) CHARACTER SET utf8," +
            "`map` VARCHAR(102) CHARACTER SET utf8," +
            "`map_link` VARCHAR(459) CHARACTER SET utf8," +
            "`data_portal` VARCHAR(102) CHARACTER SET utf8," +
            "`data_link` VARCHAR(459) CHARACTER SET utf8," +
            "`contact_name` VARCHAR(102) CHARACTER SET utf8," +
            "`contact_title` INT," +
            "`contact_email` VARCHAR(102) CHARACTER SET utf8," +
            "`rainfall` INT," +
            "`elevation_m` INT," +
            "`temperature` INT," +
            "`coastal` INT," +
            "`CBI_coalition` INT," +
            "`update_date` INT," +
            "`update_by` VARCHAR(102) CHARACTER SET utf8," +
            "`update_verified` INT," +
            "`population` INT," +
            "`density_km2` NUMERIC(14, 9)," +
            "`area_km2` NUMERIC(17, 11)," +
            "`area_ha` NUMERIC(6, 1)," +
            "`OnePlanet` VARCHAR(3) CHARACTER SET utf8," +
            "`carrycap_year` VARCHAR(10) CHARACTER SET utf8," +
            "`carrycap_ghapercap` NUMERIC(5, 4)," +
            "`carrycap_source` VARCHAR(204) CHARACTER SET utf8," +
            "`myJson` VARCHAR(2000)" +
        ");";
    query.push(createLocationsTable);


    var createUser =
        "DELIMITER //\n" +
        "CREATE PROCEDURE createUser(IN emailInput VARCHAR(255), IN passwordHash VARCHAR(255), IN alias VARCHAR(255), IN userAddress VARCHAR(2000))\n" +
        "BEGIN\n" +
        "insert into users values(emailInput, passwordHash, alias, userAddress);\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(createUser);

    var createLocationSimple =
        "DELIMITER //\n" +
        "CREATE PROCEDURE createLocationSimple(IN address VARCHAR(204), IN title VARCHAR(200), IN updateBy VARCHAR(254), IN country VARCHAR(51), IN scale VARCHAR(51), IN myJson VARCHAR(2000))\n" +
        "BEGIN\n" +
        "INSERT INTO locations (address, title, update_by, country, scale, myJson) VALUES (address, title, updateBy, country, scale, myJson);\n" +
        "SELECT * FROM locations WHERE id=LAST_INSERT_ID();\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(createLocationSimple);

    var login =
        "DELIMITER //\n" +
        "CREATE PROCEDURE login(IN emailInput VARCHAR(255))\n" +
        "BEGIN\n" +
        "SELECT email, hashedPassword from users WHERE email = emailInput;\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(login);

    var updateLocation =
        "DELIMITER //\n" +
        "CREATE PROCEDURE updateLocation(IN idEntry INT, IN lat FLOAT( 10, 6 ), IN lng FLOAT( 10, 6 ))\n" +
        "BEGIN\n" +
        "UPDATE locations SET lat = lat, lng = lng where id = idEntry;\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(updateLocation);

    var addEmail =
        "DELIMITER //\n" +
        "CREATE PROCEDURE addEmail(IN email VARCHAR(2048))\n" +
        "BEGIN\n" +
        "INSERT INTO emails (email) VALUES (email);\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(addEmail);

    var getAllUploadsByUser =
        "DELIMITER //\n" +
        "CREATE PROCEDURE getAllUploadsByUser(IN userId VARCHAR(2048))\n" +
        "BEGIN\n" +
        "SELECT * from locations where update_by = userId;\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(getAllUploadsByUser);

    var getUploadById =
        "DELIMITER //\n" +
        "CREATE PROCEDURE getUploadById(IN inputId int(11))\n" +
        "BEGIN\n" +
        "SELECT * from locations where id = inputId;\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(getUploadById);

    var getAllUsers =
        "DELIMITER //\n" +
        "CREATE PROCEDURE GetAllUsers(emailInput char(254))\n" +
        "BEGIN\n" +
        "SELECT * FROM Users where email = emailInput;\n" +
        "END //\n" +
        "DELIMITER ;";
    query.push(getAllUsers);

    programsQuery = "CREATE TABLE programs(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`programName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`programType` INT, " + //0 = index
        "`private` BIT, " +
        "`author` VARCHAR(254), " +
        "`creationDate` DATE" +
        ");";

    sitesQuery = "CREATE TABLE sites(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`siteName` VARCHAR(2048) CHARACTER SET utf8" +
        "" +
            /*
            set site profile index of data points to int values that are negative so that we can reference them from the indicators
            example areaIndex INT = -1
            calculation: density = population / -1
            */
        ");";

    sitesByUserQuery = "CREATE TABLE sitesByUser(" +
        "`site` INT NOT NULL, " +
        "`user` VARCHAR(254) NOT NULL" +
        ");";

    indicatorsQuery = "CREATE TABLE indicators(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`indicatorName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`numberInProgram` INT, " +
        "`categoryInProgram` INT, " +
        "`archetype` INT, " + // governance and management, public involvement, location profile, natural infrastructure, species and habitat assessments
        "`weight` FLOAT(10, 2), " +
        "`required` BIT, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`descriptionOfCalculation` VARCHAR(2048) CHARACTER SET utf8, " +
        "`calculation` VARCHAR(2048), " + //example: (1 * 2) / 3 or if(1 > 1.0) 1; else 0;
        "`private` BIT, " +
        "`author` VARCHAR(254), " +
        "`creationDate` DATE" +
        ");";

    indicatorValues = "CREATE TABLE indicatorValues(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`name` VARCHAR(2048), " +
        "`indicator` INT, " +
        "`type` INT, " + //text, float, int / stage
        "`required` BIT, " +
        "`orderInOperation` INT, " +
        "`rangeMin` FLOAT(10, 2), " +
        "`rangeMax` FLOAT(10, 2), " +
        "`defaultNumericalValue` FLOAT(10, 2), " +
        "`defaultTextValue` VARCHAR(2048), " +
        "`completionThreshold` FLOAT(10, 2)" +
        ");";

    indicatorRatingsQuery = "CREAT TABLE indicatorRatings(" +
        "`indicator` INT, " +
        "`user` VARCHAR(254), " +
        "`rating` INT" +
        ");";

    documentsQuery = "CREATE TABLE documents(" +
        "`documentName` VARCHAR(255), " +
        "`documentUrl` VARCHAR(2048)" +
        ");";

    categoriesQuery = "CREATE TABLE categories(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`program` INT, " +
        "`categoryName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`number` INT, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`completeColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`incompleteColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`partiallyCompleteColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`notApplicableColor` VARCHAR(8) CHARACTER SET utf8" +
        ");";

    permissionsQuery = "CREATE TABLE permissions(" +
        "`user` VARCHAR(254) NOT NULL, " +
        "`permissionLevel` INT" +
        "`program` INT, " +
        "`indicator` INT" +
        "`site` INT" +
        ");";

    userDataQuery = "CREATE TABLE userData(" +
        "`site` INT," +
        "`program` INT, " +
        "`year` INT, " +
        // "`indicator` INT, " +
        "`indicatorValue` INT, " +
        "`numericalValue` FLOAT(10, 2), " +
        "`textValue` VARCHAR(2048), " +
        "`name` VARCHAR(2048), " +
        "`notes` VARCHAR(2048)" +
        ");";

    userUpdateQuery = "ALTER TABLE users ADD privileges INT;";

    insertIntoIndicatorsQuery = "" +
        "insert into programs(programName, description, programType, private) values('Singapore Index', 'An index made in Singapore', 0, 0);" +

        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Natural Areas in the City, 1, 1, " +
        "archetype, 1.0, 1, description, (Total area of natural, restored and naturalised areas) ÷ (Total area of city), calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Connectivity Measures, 2,  1, " +
        "archetype, 1.0, 1, description, \nWhere:\n\nA total is the total area of all natural areas\n\nA 1 to A n are areas that are distinct from each other (i.e. more than or equal to 100m apart)\n\nn is the total number of connected natural areas\n\nThis measures effective mesh size of the natural areas in the city. A 1 to A n may consist of areas that are the sum of two or more smaller patches which are connected. In general, patches are considered as connected if they are less than 100m apart.\nHowever, exceptions to the above rule includes\nanthropogenic barriers such as:\nRoads (15m or more in width; or are smaller but have a high traffic volume of more than 5000 cars per day)\nRivers that are highly modified and other artificial barriers such as heavily concretised canals and heavily built up areas. Any other artificial structures that the city would consider as a barrier, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Native Biodiversity in Built Up Areas (Bird Species), 3,  1, " +
        "archetype, 1.0, 1, description, Number of native bird species in built up areas where built up areas include impermeable surfaces like buildings, roads, drainage channels, etc., and anthropogenic green spaces like roof gardens, roadside planting, golf courses, private gardens, cemeteries, lawns, urban parks, etc. Areas that are counted as natural areas in indicator 1 should not be included in this indicator., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Vascular Plant Species, 4,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Bird Species, 5,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Butterfly Species, 6,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Native Species (any other taxonomic group selected by the city), 7,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Native Species (any other taxonomic group selected by the city), 8,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Protected Natural Areas, 9,  1, " +
        "archetype, 1.0, 1, description, (Area of protected or secured natural areas) ÷ (Total area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Invasive Alien Species, 10, 1, " +
        "archetype, 1.0, 1, description, (Number of invasive alien species) ÷ (Total number of species), calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Regulation of Quantity of Water, 11, 2, " +
        "archetype, 1.0, 1, description, (Total permeable area) ÷ (Total terrestrial area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Climate Regulation: Carbon Storage and Cooling Effect Of Vegetation, 12, 2, " +
        "archetype, 1.0, 1, description, (Tree canopy cover) ÷ (Total terrestrial area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Recreational and Educational Services: Area of Parks with Natural Areas, 13, 2, " +
        "archetype, 1.0, 1, description, (Area of parks with natural areas and protected or secured natural areas)*/1000 persons, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Recreational and Educational Services: Number of Formal Education Visits per Child Below 16 Years to Parks with Natural Areas per Year, 14, 2, " +
        "archetype, 1.0, 1, description, Average number of formal educational visits per child below 16 years to parks with natural areas or protected or secured natural areas per year, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Budget Allocated to Biodiversity, 15, 3, " +
        "archetype, 1.0, 1, description, (Amount spent on biodiversity related administration) ÷ (Total budget of city)\n\nComputation should include the city’s or municipality’s manpower budget as well as its operational and biodiversity related project expenditures. The calculation may also include the figures of government linked corporations that have a component spent on biodiversity, and the amount of government funds paid to private companies for biodiversity related administration where such figures are available., calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Number of Biodiversity Projects Implemented by the City Annually, 16, 3, " +
        "archetype, 1.0, 1, description, Number of programmes and projects that are being implemented by the city authorities, possibly in partnership with private sector, NGOs, etc. per year. In addition to submitting the total number of projects and programmes carried out, cities are encouraged to provide a listing of the projects and to categorise the list into projects that are:\n1. Biodiversity related\n2. Ecosystems services related, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Policies, Rules and Regulations – Existence of Local Biodiversity Strategy and Action Plan, 17, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Institutional Capacity: Number of Biodiversity Related Functions, 18, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Institutional Capacity: Number of City or Local Government Agencies Involved in Inter-agency Co-operation Pertaining to Biodiversity Matters, 19, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Participation and Partnership: Existence of Formal or Informal Public Consultation Process, 20, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Participation and Partnership: Number of Agencies/Private Companies/NGOs/Academic Institutions/International Organisations with which the City is Partnering in Biodiversity Activities, Projects and Programmes, 21, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Education and Awareness: Is Biodiversity or Nature Awareness Included in the School Curriculum, 22, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, numberInProgram, categoryInProgram, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Education and Awareness: Number of Outreach or Public Awareness Events Held in the City per Year, 23, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "";

    insertIntoSingaporeIndexIndicatorValues =
        "insert into indicatorValues () values ();";

    insertIntoSingaporeIndexCategories =
        "insert into categories (program, categoryName, number, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 1, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
        "insert into categories (program, categoryName, number, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 2, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
        "insert into categories (program, categoryName, number, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 3, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
        "";

    /*
     Indicator ratings across multiple categories
     Indicator Certifications
     Wants popularity of indicators
     Stages of different Indicators - arbitrary
     */

    //user properties:
    //verified/unverified - ie:City of Chicago vs. some guy interested in Chicago

    //superadmins - Glen, Jen, Mika, CBI
    //managers - can create and edit custom indicators/programs can make data public and add a user or manager to a site and switch user privileges
    //view only - can only see information, cannot change it
    //worker - can input data
    //public - can view public data

    // usersQuery = "superAdmins (Glen, Jen, Mika)" +
    //     "" +
    //     "";

    // Achievements - (ie: Silver, gold, platinum)
    // Unique ID
    // Name
    // Icon
    // Program
    // Threshold

    // console.log(query.length);
    // console.log(query);
    // for(var i = 0; i < query.length; i++){
    //     console.log(query[i]);
    // }
    
    for(var i = 0; i < query.length; i++) {

        console.log(query[i]);
        connection.query(query[i], function (err, rows, fields) {
            if (!err) {
                // console.log(rows);
                console.log("success");
            } else {
                console.log('Error while performing Query.');
            }
        });

    }

    connection.end();
}

module.exports = router;