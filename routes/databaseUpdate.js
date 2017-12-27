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

    createDbQuery = "CREATE DATABASE ubhub;";
    query.push(createDbQuery);

    useDbQuery = "use ubhub;";
    query.push(useDbQuery);

    createUsersTableQuery =
        "CREATE TABLE users(" +
            "email VARCHAR(255) NOT NULL," +
            "userAddress VARCHAR(2000)," +
            "hashedPassword CHAR(255) not null," + //pretty sure bcrypt only allows for 60 chars in a hash
            "alias VARCHAR(255) NOT NULL," +
            "privileges INT, " +
            "PRIMARY KEY (email)," +
            "UNIQUE INDEX (email)" +
            ");";
    query.push(createUsersTableQuery);

    // createDevelopmentUser =
    //     "INSERT INTO users(email, hashedPassword) VALUES ('user', '$2a$10$ZuthLMZuo.F9LOfYNs3NpO6eWrBJoq8NYyd7AmOgwC3sPQLBxUbT6');";
    // query.push(createDevelopmentUser);


    createPostsTable =
      "CREATE TABLE posts(" +
        "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
        "parent INT," +
        "author VARCHAR(255) NOT NULL," +
        "subject VARCHAR(255) NOT NULL," +
        "body TEXT," +
        "creationDate DATETIME," +
        "views INT," +
        "tags VARCHAR(2048)," +
        "keywords VARCHAR(2048)," +
        "status VARCHAR(255)," +
        "acceptedAnswerId INT" +
      ");";
    query.push(createPostsTable);

    createVotesTable =
      "CREATE TABLE votes(" +
      "author VARCHAR(255) NOT NULL," +
      "postId INT NOT NULL," +
      "deltaUpvotes INT" +
      ");";
    query.push(createVotesTable);

    createEmailsTableQuery =
        "CREATE TABLE emails (" +
            "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
            "`email` VARCHAR(2048) CHARACTER SET utf8" +
        ");";
    query.push(createEmailsTableQuery);

    createLocationsTableQuery =
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
    query.push(createLocationsTableQuery);


    createUserQuery =
        "CREATE PROCEDURE createUser(IN emailInput VARCHAR(255), IN passwordHash VARCHAR(255), IN alias VARCHAR(255), IN userAddress VARCHAR(2000))\n" +
        "BEGIN\n" +
        "insert into users (email, hashedPassword, alias, userAddress) values(emailInput, passwordHash, alias, userAddress);\n" +
        "END";
    query.push(createUserQuery);

    createLocationSimpleQuery =
        "CREATE PROCEDURE createLocationSimple(IN address VARCHAR(204), IN title VARCHAR(200), IN updateBy VARCHAR(255), IN country VARCHAR(51), IN scale VARCHAR(51), IN myJson VARCHAR(2000))\n" +
        "BEGIN\n" +
        "INSERT INTO locations (address, title, update_by, country, scale, myJson) VALUES (address, title, updateBy, country, scale, myJson);\n" +
        "SELECT * FROM locations WHERE id=LAST_INSERT_ID();\n" +
        "END";
    query.push(createLocationSimpleQuery);

    loginQuery =
        "CREATE PROCEDURE login(IN emailInput VARCHAR(255))\n" +
        "BEGIN\n" +
        "SELECT email, hashedPassword from users WHERE email = emailInput;\n" +
        "END";
    query.push(loginQuery);

    updateLocationQuery =
        "CREATE PROCEDURE updateLocation(IN idEntry INT, IN lat FLOAT( 10, 6 ), IN lng FLOAT( 10, 6 ))\n" +
        "BEGIN\n" +
        "UPDATE locations SET lat = lat, lng = lng where id = idEntry;" +
        "END";
    query.push(updateLocationQuery);

    addEmailQuery =
        "CREATE PROCEDURE addEmail(IN email VARCHAR(2048))\n" +
        "BEGIN\n" +
        "INSERT INTO emails (email) VALUES (email);\n" +
        "END";
    query.push(addEmailQuery);

    getAllUploadsByUserQuery =
        "CREATE PROCEDURE getAllUploadsByUser(IN userId VARCHAR(2048))\n" +
        "BEGIN\n" +
        "SELECT * from locations where update_by = userId;\n" +
        "END";
    query.push(getAllUploadsByUserQuery);

    getUploadByIdQuery =
        "CREATE PROCEDURE getUploadById(IN inputId int(11))\n" +
        "BEGIN\n" +
        "SELECT * from locations where id = inputId;" +
        "END";
    query.push(getUploadByIdQuery);

    getAllUsersQuery =
        "CREATE PROCEDURE GetAllUsers(emailInput char(255))\n" +
        "BEGIN\n" +
        "SELECT * FROM Users where email = emailInput;\n" +
        "END";
    query.push(getAllUsersQuery);

    createAddPostQuery =
      "CREATE PROCEDURE addForumPost(IN author varchar(255), IN parent varchar(255), IN subject varchar(255), IN body TEXT, IN creationDate DATETIME)\n" +
      "BEGIN\n" +
      "INSERT INTO posts (author, parent, subject, body, creationDate, upvotes, downvotes, views, status) VALUES (author, parent, subject, body, creationDate, 0, 0, 0, 'published');\n" +
      "SELECT * FROM posts WHERE id=LAST_INSERT_ID();\n" +
      "END";
    query.push(createAddPostQuery);

    createGetPostQuery =
      "CREATE PROCEDURE getPostById(IN inputId int)\n"+
      "BEGIN\n" +
      "SELECT * FROM posts WHERE `id`=inputId;\n" +
      "END";
    query.push(createGetPostQuery);

    createGetPostAndAllSubsQuery =
      "CREATE PROCEDURE getPostAndAllSubs(IN postId int)\n"+
      "SELECT * FROM posts WHERE `id` = postId \n"+
      "UNION\n" +
      "SELECT * FROM posts WHERE `parent` = postId \n" +
      "UNION\n" +
      "SELECT * FROM posts WHERE `parent` in \n" +
      "(SELECT id FROM posts WHERE `parent` = postId)";

    query.push(createGetPostAndAllSubsQuery);

    createGetAllPostsQuery =
      "CREATE PROCEDURE getAllPosts()\n" +
      "BEGIN\n" +
      "SELECT * FROM posts;\n" +
      "END";
    query.push(createGetAllPostsQuery);

    createGetPostsByParentQuery =
      "CREATE PROCEDURE getPostsByParent(IN parentId int)\n" +
      "BEGIN\n" +
      "SELECT * FROM posts WHERE `parent`=parentId;\n" +
      "END";
    query.push(createGetPostsByParentQuery);



    createDeletePostQuery =
      "CREATE PROCEDURE deletePostById(IN id int)\n"+
      "BEGIN\n" +
      "DELETE FROM posts WHERE `id`=id;\n" +
      "END";
    query.push(createDeletePostQuery);

    createUpvotePostQuery =
      "CREATE PROCEDURE upvotePostById(IN authorId VARCHAR(255), IN post INT)\n"+
      "BEGIN\n" +
      "INSERT INTO votes (author, postId, deltaUpvotes) VALUES(authorId, post, 1);\n" +
      "END";
    query.push(createUpvotePostQuery);

    createDownvotePostQuery =
      "CREATE PROCEDURE downvotePostById(IN authorId VARCHAR(255), IN post INT)\n"+
      "BEGIN\n" +
      "INSERT INTO votes (author, postId, deltaUpvotes) VALUES(authorId, post, -1);\n" +
      "END";
    query.push(createDownvotePostQuery);

    createGetDeltaVotesTotalQuery =
      "CREATE PROCEDURE getDeltaVotesTotal(IN post INT)\n"+
      "BEGIN\n" +
      "SELECT SUM(deltaUpvotes) from votes WHERE `postId` = post;\n"+
      "END";
    query.push(createGetDeltaVotesTotalQuery);

    createGetUpvotesTotalQuery =
      "CREATE PROCEDURE getUpvotesTotal(IN post INT)\n"+
      "BEGIN\n" +
      "SELECT SUM(deltaUpvotes) from votes WHERE `postId` = post AND `deltaUpvotes` = 1;\n"+
      "END";
    query.push(createGetUpvotesTotalQuery);

    createGetDownvotesTotalQuery =
      "CREATE PROCEDURE getDownvotesTotal(IN post INT)\n"+
      "BEGIN\n" +
      "SELECT SUM(deltaUpvotes) from votes WHERE `postId` = post AND `deltaUpvotes` = -1;\n"+
      "END";
    query.push(createGetDownvotesTotalQuery);

    createGetAuthorVoteForPostQuery =
      "CREATE PROCEDURE getAuthorVoteForPost(IN post INT, IN authorId VARCHAR(255))\n"+
      "BEGIN\n"+
      "SELECT deltaUpvotes FROM votes WHERE `author` = authorId AND `postId` = post;\n"+
      "END";
    query.push(createGetAuthorVoteForPostQuery);

    createUnvoteForPostQuery =
      "CREATE PROCEDURE unvoteForPost(IN post INT, IN authorId VARCHAR(255))\n"+
      "BEGIN\n"+
      "DELETE FROM votes WHERE `author` = authorId AND `postId` = post;\n"+
      "END";
    query.push(createUnvoteForPostQuery);

    createAddViewQuery =
      "CREATE PROCEDURE addView(IN post INT)\n"+
      "BEGIN\n"+
      "UPDATE posts SET `views` = views + 1 WHERE id = post;\n"+
      "END";
    query.push(createAddViewQuery);

    createProgramsTableQuery =
        "CREATE TABLE programs(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`programName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`programType` INT, " + //0 = index
        "`private` BIT, " +
        "`author` VARCHAR(255), " +
        "`creationDate` DATE" +
        ");";
    query.push(createProgramsTableQuery);

    createProgramQuery =
        "CREATE PROCEDURE createProgram(IN programName VARCHAR(2048), IN author VARCHAR(255))\n" +
        "BEGIN\n" +
        "INSERT INTO programs(programName, author) VALUES (programName, author);\n" +
        "SELECT * FROM programs WHERE id=LAST_INSERT_ID();\n" +
        "END";
    query.push(createProgramQuery);

    createSitesTableQuery =
        "CREATE TABLE sites(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`siteName` VARCHAR(2048) CHARACTER SET utf8" +
        "" +
            /*
            set site profile index of data points to int values that are negative so that we can reference them from the indicators
            example areaIndex INT = -1
            calculation: density = population / -1
            */
        ");";
    query.push(createSitesTableQuery);

    createSitesByUserTableQuery =
        "CREATE TABLE sitesByUser(" +
        "`site` INT NOT NULL, " +
        "`user` VARCHAR(255) NOT NULL" +
        ");";
    query.push(createSitesByUserTableQuery);

    createGetSitesByUserQuery =
        "CREATE PROCEDURE getSitesByUser(IN emailInput varchar(255))\n"+
        "BEGIN\n" +
        "SELECT * FROM sites where id IN (SELECT site FROM sitesByUser WHERE 'email' = \"emailInput\");\n" +
        "END";
    query.push(createGetSitesByUserQuery);

    createSiteQuery =
        "CREATE PROCEDURE createSite(IN siteName VARCHAR(2048), IN userInput VARCHAR(255))\n" +
        "BEGIN\n" +
        "INSERT INTO sites(siteName) VALUES (siteName);\n" +
        "SET @last_id_in_sites = LAST_INSERT_ID();\n" +
        "INSERT INTO sitesByUser(user, site) VALUES (userInput, @last_id_in_sites);\n" +
        "SELECT * FROM sitesByUser WHERE site=LAST_INSERT_ID();\n" +
        "END";
    query.push(createSiteQuery);


    createIndicatorsTableQuery =
        "CREATE TABLE indicators(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`indicatorName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`positionInCategory` INT, " +
        "`categoryId` INT, " +
        "`archetype` INT, " + // governance and management, public involvement, location profile, natural infrastructure, species and habitat assessments
        "`weight` FLOAT(10, 2), " +
        "`required` BIT, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`descriptionOfCalculation` VARCHAR(2048) CHARACTER SET utf8, " +
        "`calculation` VARCHAR(2048), " + //example: (1 * 2) / 3 or if(1 > 1.0) 1; else 0;
        "`private` BIT, " +
        "`author` VARCHAR(255), " +
        "`creationDate` DATE" +
        ");";
    query.push(createIndicatorsTableQuery);

    createIndicatorQuery =
        "CREATE PROCEDURE createIndicator(IN indicatorName VARCHAR(2048), IN author VARCHAR(255))\n" +
        "BEGIN\n" +
        "INSERT INTO indicators(indicatorName, author) VALUES (indicatorName, author);\n" +
        "SELECT * FROM indicators WHERE id=LAST_INSERT_ID();\n" +
        "END";
    query.push(createIndicatorQuery);

    createIndicatorInProgramQuery =
        "CREATE PROCEDURE createIndicatorInProgram(IN indicatorName VARCHAR(2048), positionInCategory INT, categoryId INT)\n" +
        "BEGIN\n" +
        "INSERT INTO indicators(indicatorName, positionInCategory, categoryId) VALUES (indicatorName, positionInCategory, categoryId);\n" +
        "SELECT * FROM indicators WHERE id=LAST_INSERT_ID();\n" +
        "END";
    query.push(createIndicatorInProgramQuery);

    createIndicatorValuesTableQuery =
        "CREATE TABLE indicatorValues(" +
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
    query.push(createIndicatorValuesTableQuery);

    createIndicatorRatingsTableQuery =
        "CREATE TABLE indicatorRatings(" +
        "`indicator` INT, " +
        "`user` VARCHAR(255), " +
        "`rating` INT" +
        ");";
    query.push(createIndicatorRatingsTableQuery);

    createDocumentsTableQuery =
        "CREATE TABLE documents(" +
        "`documentName` VARCHAR(255), " +
        "`documentUrl` VARCHAR(2048)" +
        ");";
    query.push(createDocumentsTableQuery);

    createCategoriesTableQuery =
        "CREATE TABLE categories(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
        "`program` INT, " +
        "`categoryName` VARCHAR(2048) CHARACTER SET utf8, " +
        "`positionInProgram` INT, " +
        "`description` VARCHAR(2048) CHARACTER SET utf8, " +
        "`completeColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`incompleteColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`partiallyCompleteColor` VARCHAR(8) CHARACTER SET utf8, " +
        "`notApplicableColor` VARCHAR(8) CHARACTER SET utf8" +
        ");";
    query.push(createCategoriesTableQuery);

    createCategoryQuery =
        "CREATE PROCEDURE createCategory(IN categoryName VARCHAR(2048), IN positionInProgram INT, IN program INT)\n" +
        "BEGIN\n" +
        "INSERT INTO categories(categoryName, positionInProgram, program) VALUES (categoryName, positionInProgram, program);\n" +
        "SELECT * FROM categories WHERE id=LAST_INSERT_ID();\n" +
        "END";
    query.push(createCategoryQuery);

    createPermissionsTableQuery =
        "CREATE TABLE permissions(" +
        "`user` VARCHAR(255) NOT NULL, " +
        "`permissionLevel` INT, " +
        "`program` INT, " +
        "`indicator` INT, " +
        "`site` INT" +
        ");";
    query.push(createPermissionsTableQuery);

    createUserDataTableQuery =
        "CREATE TABLE userData(" +
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
    query.push(createUserDataTableQuery);




    insertIntoIndicatorsQuery =
        "insert into programs(programName, description, programType, private) values('Singapore Index', 'An index made in Singapore', 0, 0);" +

        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Natural Areas in the City, 1, 1, " +
        "archetype, 1.0, 1, description, (Total area of natural, restored and naturalised areas) ÷ (Total area of city), calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Connectivity Measures, 2,  1, " +
        "archetype, 1.0, 1, description, \nWhere:\n\nA total is the total area of all natural areas\n\nA 1 to A n are areas that are distinct from each other (i.e. more than or equal to 100m apart)\n\nn is the total number of connected natural areas\n\nThis measures effective mesh size of the natural areas in the city. A 1 to A n may consist of areas that are the sum of two or more smaller patches which are connected. In general, patches are considered as connected if they are less than 100m apart.\nHowever, exceptions to the above rule includes\nanthropogenic barriers such as:\nRoads (15m or more in width; or are smaller but have a high traffic volume of more than 5000 cars per day)\nRivers that are highly modified and other artificial barriers such as heavily concretised canals and heavily built up areas. Any other artificial structures that the city would consider as a barrier, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Native Biodiversity in Built Up Areas (Bird Species), 3,  1, " +
        "archetype, 1.0, 1, description, Number of native bird species in built up areas where built up areas include impermeable surfaces like buildings, roads, drainage channels, etc., and anthropogenic green spaces like roof gardens, roadside planting, golf courses, private gardens, cemeteries, lawns, urban parks, etc. Areas that are counted as natural areas in indicator 1 should not be included in this indicator., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Vascular Plant Species, 4,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Bird Species, 5,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Butterfly Species, 6,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Native Species (any other taxonomic group selected by the city), 7,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Change in Number of Native Species (any other taxonomic group selected by the city), 8,  1, " +
        "archetype, 1.0, 1, description, The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Protected Natural Areas, 9,  1, " +
        "archetype, 1.0, 1, description, (Area of protected or secured natural areas) ÷ (Total area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Proportion of Invasive Alien Species, 10, 1, " +
        "archetype, 1.0, 1, description, (Number of invasive alien species) ÷ (Total number of species), calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Regulation of Quantity of Water, 11, 2, " +
        "archetype, 1.0, 1, description, (Total permeable area) ÷ (Total terrestrial area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Climate Regulation: Carbon Storage and Cooling Effect Of Vegetation, 12, 2, " +
        "archetype, 1.0, 1, description, (Tree canopy cover) ÷ (Total terrestrial area of the city), calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Recreational and Educational Services: Area of Parks with Natural Areas, 13, 2, " +
        "archetype, 1.0, 1, description, (Area of parks with natural areas and protected or secured natural areas)*/1000 persons, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Recreational and Educational Services: Number of Formal Education Visits per Child Below 16 Years to Parks with Natural Areas per Year, 14, 2, " +
        "archetype, 1.0, 1, description, Average number of formal educational visits per child below 16 years to parks with natural areas or protected or secured natural areas per year, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Budget Allocated to Biodiversity, 15, 3, " +
        "archetype, 1.0, 1, description, (Amount spent on biodiversity related administration) ÷ (Total budget of city)\n\nComputation should include the city’s or municipality’s manpower budget as well as its operational and biodiversity related project expenditures. The calculation may also include the figures of government linked corporations that have a component spent on biodiversity, and the amount of government funds paid to private companies for biodiversity related administration where such figures are available., calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Number of Biodiversity Projects Implemented by the City Annually, 16, 3, " +
        "archetype, 1.0, 1, description, Number of programmes and projects that are being implemented by the city authorities, possibly in partnership with private sector, NGOs, etc. per year. In addition to submitting the total number of projects and programmes carried out, cities are encouraged to provide a listing of the projects and to categorise the list into projects that are:\n1. Biodiversity related\n2. Ecosystems services related, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Policies, Rules and Regulations – Existence of Local Biodiversity Strategy and Action Plan, 17, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Institutional Capacity: Number of Biodiversity Related Functions, 18, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Institutional Capacity: Number of City or Local Government Agencies Involved in Inter-agency Co-operation Pertaining to Biodiversity Matters, 19, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Participation and Partnership: Existence of Formal or Informal Public Consultation Process, 20, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Participation and Partnership: Number of Agencies/Private Companies/NGOs/Academic Institutions/International Organisations with which the City is Partnering in Biodiversity Activities, Projects and Programmes, 21, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Education and Awareness: Is Biodiversity or Nature Awareness Included in the School Curriculum, 22, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "insert into indicators(indicatorName, positionInCategory, categoryId, archetype, weight, required, description, descriptionOfCalculation, calculation, private) values(Education and Awareness: Number of Outreach or Public Awareness Events Held in the City per Year, 23, 3, " +
        "archetype, 1.0, 1, description, descriptionOfCalculation, calculation, 0);" +
        "";

    insertIntoSingaporeIndexIndicatorValues =
        "insert into indicatorValues () values ();";

    insertIntoSingaporeIndexCategories =
        "insert into categories (program, categoryName, order, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 1, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
        "insert into categories (program, categoryName, order, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 2, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
        "insert into categories (program, categoryName, order, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor) values (1, categoryName, 3, description, completeColor, incompleteColor, partiallyCompleteColor, notApplicableColor);" +
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


    // query = [useDbQuery, ];

    for(var i = 0; i < query.length; i++) {

        console.log(query[i]);
        connection.query(query[i], function (err, rows, fields) {
            if (!err) {
                console.log("success");
            } else {
                console.log('Error while performing Query.');
                console.log(err.code);
                console.log(err.message);
            }
        });

    }

    connection.end();
}

module.exports = router;
