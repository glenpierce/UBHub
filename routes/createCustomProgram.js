var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

router.get('/', function(req, res, next) {
    var indicators = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from indicators';
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            console.log(rows);
            indicators = rows;
            res.render('customProgram', {indicators:JSON.stringify(indicators), username:req.session.user});
            console.log({indicators:JSON.stringify(indicators)});
        }
    });
    connection.end();
});

router.post('/', function(req, res){
    var newProgram = req.body;
    response = "";

    if (req.session && req.session.user) {
        //create new program
        createCategories = createCategoriesFunction(newProgram); //this is creating a callback function that includes a closure containing the newProgram object that we want to keep track of in our callbacks.
        makeDbCall("CALL createProgram('" + newProgram.categories[0].name + "', '" + req.session.user + "')", createCategories);
        response = "here we go!"
    } else {
        //send the user a popup that tells them they aren't logged in
        response = "you aren't logged in";
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(response);
    res.end();
});

createCategoriesFunction = function(program) {
    return function (rows) {
        console.log(rows);
        console.log(program);
        programId = rows[0][0].id;
        number = 1;
        for (category in program.categories) {
            //create new category
            console.log("category in categories=");
            console.log(category);
            createIndicators = createIndicatorsFunction(program.categories[category]);
            makeDbCall("CALL createCategory('" + category + "', '" + number + "', '" + programId + "')", createIndicators);
            number++;
        }
    };
};

createIndicatorsFunction = function(category) {
    return function() {
        console.log("category in indicators=");
        console.log(category);
        numberInProgram = 0;
        categoryInProgram = 0;
        for (indicator in category.indicators) {
            //create new indicator
            makeDbCall("CALL createIndicatorInProgram('" + indicator + "', '" + numberInProgram + "', '" + categoryInProgram + "')", console.log);
        }
    };
};

makeDbCall = function(queryString, callback){
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = queryString;
    console.log(query);
    connection.query(query, function(err, rows, fields) {
        if (!err) {
            callback(rows);
        } else {
            console.log('Error while performing Query.');
            console.log(err.code);
            console.log(err.message);
        }
    });
    connection.end();
};

module.exports = router;