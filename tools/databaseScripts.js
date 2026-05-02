import express from 'express';
import mysql from 'mysql2';
const router = express.Router();
import https from 'https';
import config from '../nodeServer/config.js';

// config.rdsHost="192.168.99.100"; //this should be your Docker container's IP address
config.rdsHost="127.0.0.1"; //this should be your Docker container's IP address
config.rdsUser="root";
config.rdsPassword="my-secret-pw";

let createDb;
let useDb;

let createUsersTable;
let locationsTable;

let createUserProcedure;
let loginProcedure;
let updateLocationProcedure;

let documentsTable;
let participationTable;
let mapButtonsTable;
let contactsTable;

createDb = `CREATE DATABASE ubhub;`;
useDb = `use ubhub;`;

createUsersTable =
    `CREATE TABLE users(
            email VARCHAR(255) NOT NULL,
            userAddress VARCHAR(2000),
            hashedPassword CHAR(255) not null,
            alias VARCHAR(255) NOT NULL,
            privileges INT,
            PRIMARY KEY (email),
            UNIQUE INDEX (email)
        );`;

locationsTable =
    `CREATE TABLE locations (
            \`id\` INT,
            \`inst_address\` VARCHAR(255) CHARACTER SET utf8,
            \`lat\` NUMERIC(10, 7),
            \`lng\` NUMERIC(10, 7),
            \`inst_title\` VARCHAR(255) CHARACTER SET utf8,
            \`country\` VARCHAR(255) CHARACTER SET utf8,
            \`scale\` VARCHAR(255) CHARACTER SET utf8,
            \`population\` INT,
            \`density_km2\` NUMERIC(14, 9),
            \`area_km2\` NUMERIC(12,3),
            \`area_ha\` NUMERIC(7, 2),
            \`biodiversity_url\` VARCHAR(512) CHARACTER SET utf8,
            \`url_verifydate\` DATETIME,
            \`wwf_biome\` VARCHAR(255) CHARACTER SET utf8,
            \`wwf_terrestrial_ecoregion\` VARCHAR(255) CHARACTER SET utf8,
            \`hotspot\` VARCHAR(255) CHARACTER SET utf8,
            \`conservation_status_wwf\` VARCHAR(255) CHARACTER SET utf8
        );`;

createUserProcedure =
    `CREATE PROCEDURE createUser(IN emailInput VARCHAR(255), IN passwordHash VARCHAR(255), IN alias VARCHAR(255), IN userAddress VARCHAR(2000))\n
            BEGIN\n
            insert into users (email, hashedPassword, alias, userAddress) values(emailInput, passwordHash, alias, userAddress);\n
        END;`;

loginProcedure =
    `CREATE PROCEDURE login(IN emailInput VARCHAR(255))\n
            BEGIN\n
            SELECT email, hashedPassword from users WHERE email = emailInput;\n
        END;`;

updateLocationProcedure =
    `CREATE PROCEDURE updateLocation(IN idEntry INT, IN lat FLOAT( 10, 6 ), IN lng FLOAT( 10, 6 ))\n
            BEGIN\n
            UPDATE locations SET lat = lat, lng = lng where id = idEntry;
        END;`;

documentsTable =
    `CREATE TABLE documents (
            \`id\` INT,
            \`inst_id\` INT,
            \`doc_type\` VARCHAR(255) CHARACTER SET utf8,
            \`doc_year\` INT,
            \`doc_title\` VARCHAR(255) CHARACTER SET utf8,
            \`doc_url\` VARCHAR(255) CHARACTER SET utf8,
            \`keywords\` VARCHAR(512) CHARACTER SET utf8,
            \`source_url\` VARCHAR(255) CHARACTER SET utf8,
            \`link_verified\` VARCHAR(255) CHARACTER SET utf8
        );`;

participationTable =
    `CREATE TABLE participation (
            \`id\` INT,
            \`inst_id\` INT,
            \`part_category\` VARCHAR(255) CHARACTER SET utf8,
            \`part_name\` VARCHAR(255) CHARACTER SET utf8,
            \`part_year\` INT,
            \`part_data\` NUMERIC(8, 5),
            \`part_units\` VARCHAR(255) CHARACTER SET utf8,
            \`part_level\` VARCHAR(255) CHARACTER SET utf8,
            \`part_link_label\` VARCHAR(255) CHARACTER SET utf8,
            \`part_link\` VARCHAR(512) CHARACTER SET utf8,
            \`part_link_label2\` VARCHAR(255) CHARACTER SET utf8,
            \`part_link2\` VARCHAR(512) CHARACTER SET utf8,
            \`part_link_label3\` VARCHAR(255) CHARACTER SET utf8,
            \`part_link3\` VARCHAR(512) CHARACTER SET utf8,
            \`keywords\` VARCHAR(1024) CHARACTER SET utf8,
            \`link_verified\` VARCHAR(255) CHARACTER SET utf8
        );`;

mapButtonsTable =
    `CREATE TABLE mapButtons (
            \`part_name\` VARCHAR(255) CHARACTER SET utf8,
            \`button_category\` VARCHAR(255) CHARACTER SET utf8,
            \`button_text\` VARCHAR(255) CHARACTER SET utf8,
            \`image\` VARCHAR(512) CHARACTER SET utf8,
            \`marker_colors_by\` VARCHAR(255) CHARACTER SET utf8,
            \`marker_colors\` VARCHAR(255) CHARACTER SET utf8,
            \`button_link\` VARCHAR(255) CHARACTER SET utf8
        );`;

contactsTable =
    `CREATE TABLE contacts (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`fullName\` VARCHAR(1024) CHARACTER SET utf8 NOT NULL,
            \`email\` VARCHAR(255) CHARACTER SET utf8 NOT NULL,
            \`phone\` VARCHAR(64) CHARACTER SET utf8,
            \`title\` VARCHAR(512) CHARACTER SET utf8,
            \`organization\` VARCHAR(512) CHARACTER SET utf8,
            \`createdBy\` VARCHAR(255) CHARACTER SET utf8,
            \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`;

const updateLocations = function(lower, upper) {

    for (let i = lower; i < upper; i++) {
        let connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        let query = `select id, inst_address, lat from locations where id = ${i};`;
        console.log(query);
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                console.log(rows);
                console.log(rows[0].id);
                if(rows[0].id && rows[0].lat == null) {
                    getLatLong(rows[0].address, rows[0].id);
                } else {
                    console.log(`lat not null`);
                }
            } else {
                console.log(err);
            }
        });
        connection.end();
    }
};

function getLatLongAddresses(){
    let addresses = [
        "address 1",
        "address 2"
    ];
    for(let i = 0; i < addresses.length; i++){
        getLatLongSimple(addresses[i]);
    }
}

function getLatLongSimple(address) {
    getLatLong(address, null);
}

function getLatLong(address, id) {
    console.log("getLatLong");
    if(address){
        let addressQueryString = address.replace(/\s+/g, "+");
        //https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs
        let options = {
            host: 'maps.googleapis.com',
            path: '/maps/api/geocode/json?address=' + addressQueryString + "&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs",
            //since we are listening on a custom port, we need to specify it by hand
            //port: '1337',
            method: 'GET'
            // useQuerystring: true,
            // qs: 'address=' + "1600+Amphitheatre+Parkway,+Mountain+View,+CA" + "&key=AIzaSyAEKjvE48-VV37P2pGBWFphvlrx8BXGDCs"
        };

        let req = https.request(options, function(response) {
            let data = '';
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                let result = JSON.parse(data);
                // console.log(result);
                // country = '';
                if(result.results[0]){
                    //     for(component in result.results[0].address_components){
                    //         console.log("iterating");
                    //         console.log(component);
                    //         if(component.types){
                    //             console.log(component.long_name);
                    //             for(type in component.types){
                    //                 if(type == 'country'){
                    //                     country = component.long_name;
                    //                 }
                    //             }
                    //         }
                    //     }
                    //     console.log("country=" + country);
                    let lat = result.results[0].geometry.location.lat;
                    let lng = result.results[0].geometry.location.lng;
                    console.log(address + "$" + lat + "#" + lng);
                    if(id != null)
                        updateLocation(id, lat, lng);
                } else {
                    console.log(address + "no good");
                }
            });
            response.on('error', function(err) {
                console.log("google api error:" + err);
            });
        });
        req.end();
    } else {
        console.log("missing address");
    }
}

function updateLocation(id, lat, lng){
    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    const query = 'CALL updateLocation(' + id + ', "' + lat + '", "' + lng + '")';
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

const update = function(existingDB = true) {
    let query = [];
    query.push(createDb);
    query.push(useDb);

    query.push(createUsersTable);
    // createDevelopmentUser =
    //     INSERT INTO users(email, hashedPassword) VALUES ('user', '$2a$10$ZuthLMZuo.F9LOfYNs3NpO6eWrBJoq8NYyd7AmOgwC3sPQLBxUbT6');`;
    // query.push(createDevelopmentUser);
    query.push(locationsTable);

    query.push(createUserProcedure);
    query.push(loginProcedure);
    query.push(updateLocationProcedure);

    query.push(participationTable);
    query.push(documentsTable);
    query.push(mapButtonsTable);
    query.push(contactsTable);

    // console.log(query.length);
    // console.log(query);
    // for(var i = 0; i < query.length; i++){
    //     console.log(query[i]);
    // }

    // query = [useDbQuery, createIndicatorQuery, createIndicatorInProgramQuery];
    dbQuery(query, existingDB);
};

//node
//var scripts = require('./scripts');

function dbQuery(query, exitingDB = true) {
    let newConnection;

    if (exitingDB) {
        newConnection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });
    } else {
        newConnection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword
        });
    }

    const connection =  newConnection;

    connection.connect();

    for (let i = 0; i < query.length; i++) {

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

module.exports.updateLocations = updateLocations;
module.exports.update = update;
module.exports.getLatLong = getLatLong;
module.exports.getLatLongAddresses = getLatLongAddresses;
