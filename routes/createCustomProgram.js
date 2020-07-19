const express = require('express');
const router = express.Router();
const pool = require('../ConnectionPool.js').pool;
const session = require('client-sessions');
const path = require("path");
const app = express();
const config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

function createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId) {
    for(let i = 0; i < newProgram.items.length; i++) {
        console.log("creating program recursively: " + i);
        if(newProgram.items[i].isProcessed) {
            continue;
        }
        switch (newProgram.items[i].type) {
            case "Category":
                newProgram.items[i].isProcessed = true;
                makeDbCallAsPromise("CALL createCategory('" + newProgram.items[i].name + "', '" + i + "', '" + programId + "')")
                    .then(function (rows) {
                        console.log(rows[0][0].id);
                        currentCategoryId = rows[0][0].id;
                        createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId);
                });
                break;
            // case "CheckBoxGroup":
            //     makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram.items[i].name + "', '" + i + "', '" + currentCategoryId + "')")
            //         .then(function (rows) {
            //             createChildrenRecursively(rows[0][0].id, newProgram.items[i].architype, newProgram.items[i].children);
            //     });
            //     break;
            // case "RadioButtonGroup":
            //     makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram.items[i].name + "', '" + i + "', '" + currentCategoryId + "')")
            //         .then(function (rows) {
            //             createChildrenRecursively(rows[0][0].id, newProgram.items[i].architype, newProgram.items[i].children);
            //     });
            //     break;
            case "boolean":
                makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram.items[i].name + "', '" + i + "', '" + currentCategoryId + "')")
                    .then(function (rows) {
                        createChildrenRecursively(rows[0][0].id, newProgram.items[i].architype, newProgram.items[i].children);
                    });
                break;
            default:
                console.log("default case reached.");
                break;
        }
        return;
    }
}

function createChildrenRecursively(parentId, parentArchetype, children) {
    console.log("createChildrenRecursively");
    for(let i = 0; i < children.length; i++) {
        if (children[i].isProcessed) {
            continue;
        }
        children[i].isProcessed = true;
        makeDbCallAsPromise("CALL createIndicatorInProgram('" + newProgram.items[i].name + "', '" + i + "', '" + currentCategoryId + "')").then(function (rows) {
            createChildrenRecursively(parentId, parentArchetype, children);
        });
        return;
    }
}

router.get('/', function(req, res, next) {
    let indicators = "";

    makeDbCallAsPromise('SELECT * from indicators where positionInCategory is null').then((resolve, reject) => {
        console.log(resolve);
        const indicators = resolve;
        res.render('customProgram', {indicators:JSON.stringify(indicators), username:req.session.user});
    });
});

router.post('/', function(req, res) {
    console.log(req.body);
    let program = req.body;
    let newProgram = {
        name: "newProgramName",
        items: []
    };
    for(let i = 0; i < program.categories.length; i++) {
        const category = program.categories[i];
        category.type = "Category";
        newProgram.items.push(category);
        for(let j = 0; j < program.categories[i].indicators.length; j++) {
            let indicator = program.categories[i].indicators[j];
            indicator.type = "Indicator";
            newProgram.items.push(indicator);
        }
    }

    console.log("newProgram:");
    console.log(newProgram);
    let response = "";

    if (req.session && req.session.user) {
        if (dataIsValid(newProgram)) {
            makeDbCallAsPromise("CALL createProgram('" + newProgram.name + "', '" + req.session.user + "')")
                .then(function(result) {
                    console.log("created Program");
                    const programId = result[0][0].id;
                    let currentCategoryId;
                    let currentGroupId;
                    createProgramRecursively(newProgram, programId, currentCategoryId, currentGroupId);
                });
        } else {
            res.writeHead(422, {'Content-Type': 'text/html'});
            res.write('you need to create a new category');
            res.end();
            return;

        }
    } else {
        //send the user a popup that tells them they aren't logged in
        response = "you aren't logged in";
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(response);
    res.end();
});

function dataIsValid(program) {
    // TODO - do data validation on program.
    console.log("data is valid");
    return true;
}

makeDbCallAsPromise = function(queryString) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (error, connection) {
            connection.query(queryString, function (err, rows, fields) {
                if (!err) {
                    resolve(rows);
                } else {
                    console.log('Error while performing Query.');
                    console.log(err.code);
                    console.log(err.message);
                    reject(err);
                }
            });
            connection.release();
        });
    });
};

module.exports = router;
