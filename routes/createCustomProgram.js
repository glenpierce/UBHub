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
    duration: config.duration,
    activeDuration: config.activeDuration
}));

router.get('/editor', function(req, res, next) {
    res.render('programEditor');
});

router.post('/editor', function(req, res, next) {
    let someName = "some program name";
    makeDbCallAsPromise("CALL createProgram('" + someName + "', '" + req.session.user + "')").then(function(result){
        const programId = result[0][0].id;
        console.log(req.body);
        console.log(JSON.stringify(req.body, null, 4));
        let newProgram = req.body.newProgram;
        let currentCategoryId;
        let currentGroupId;
        createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId);
    });
});

function createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId){
    for(let i = 0; i < newProgram.length; i++){
        if(newProgram[i].isProcessed){
            continue;
        }
        switch (newProgram[i].type){
            case "Category":
                newProgram[i].isProcessed = true;
                makeDbCallAsPromise("CALL createCategory('" + "newProgram[i].name" + "', '" + i + "', '" + programId + "')").then(function (rows) {
                    console.log(rows[0][0].id);
                    currentCategoryId = rows[0][0].id;
                    createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId);
                });
                break;
            case "CheckBoxGroup":
                makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram[i].name + "', '" + i + "', '" + currentCategoryId + "')").then(function (rows) {
                    createChildrenRecursively(rows[0][0].id, newProgram[i].architype, newProgram[i].children);
                });
                break;
            case "RadioButtonGroup":
                makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram[i].name + "', '" + i + "', '" + currentCategoryId + "')").then(function (rows) {
                    createChildrenRecursively(rows[0][0].id, newProgram[i].architype, newProgram[i].children);
                });
                break;
            default:
                break;
        }
        return;
    }
}

function createChildrenRecursively(parentId, parentArchitype, children){
    for(let i = 0; i < children.length; i++) {
        if (children[i].isProcessed) {
            continue;
        }
        children[i].isProcessed = true;
        makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram[i].name + "', '" + i + "', '" + currentCategoryId + "')").then(function (rows) {
            createChildrenRecursively(parentId, parentArchitype, children);
        });
        return;
    }
}

router.get('/', function(req, res, next) {
    var indicators = "";

    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();
    query = 'SELECT * from indicators where positionInCategory is null';
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
        positionInProgram = 0;
        for (category in program.categories) {
            //create new category
            createIndicators = createIndicatorsFunction(program.categories[category]);
            makeDbCall("CALL createCategory('" + program.categories[category].name + "', '" + positionInProgram + "', '" + programId + "')", createIndicators);
            positionInProgram++;
        }
    };
};

createIndicatorsFunction = function(category) {
    return function(rows) {
        console.log(rows);
        console.log("category containing indicators=");
        console.log(category);
        categoryId = rows[0][0].id;
        positionInCategory = 0;
        for (indicator in category.indicators) {
            //create new indicator
            console.log(category.indicators);
            console.log(indicator);
            makeDbCall("CALL createIndicatorInProgram('" + category.indicators[indicator].name + "', '" + positionInCategory + "', '" + categoryId + "')", noop);
            positionInCategory++;
        }
    };
};

noop = function(){};

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

makeDbCallAsPromise = function(queryString){
    return new Promise((resolve, reject) => {
        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        query = queryString;
        console.log(query);
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log('Error while performing Query.');
                console.log(err.code);
                console.log(err.message);
                reject(err);
            }
        });
        connection.end();
    })
};

module.exports = router;