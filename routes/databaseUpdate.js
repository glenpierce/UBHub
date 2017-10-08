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
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

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

    query = ["select * from locations limit 3;", "select * from users;", "select * from emails;"];

    // Achievements - (ie: Silver, gold, platinum)
    // Unique ID
    // Name
    // Icon
    // Program
    // Threshold
    
    for(var i = 0; i < 3; i++) {

        console.log(query[i]);
        connection.query(query[i], function (err, rows, fields) {
            if (!err) {
                console.log(rows);
            } else {
                console.log('Error while performing Query.');
            }
        });

    }

    connection.end();
}

module.exports = router;