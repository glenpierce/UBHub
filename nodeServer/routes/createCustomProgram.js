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

    let response = "";

    if (req.session && req.session.user) {
        if (dataIsValid(program)) {
            makeDbCallAsPromise("CALL createProgram('" + program.name + "', '" + req.session.user + "')")
                .then(function(result) {
                    console.log("created Program");
                    const programId = result[0][0].id;
                    populateProgramCategories(program, programId);
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

function populateProgramCategories(program, programId) {
    console.log("newProgram.items.length = " + program.categories.length);
    for(let i = 0; i < program.categories.length; i++) {
        console.log("creating program categories: " + i);
        makeDbCallAsPromise("CALL createCategory('" + program.categories[i].name + "', '" + i + "', '" + programId + "')")
            .then(function (rows) {
                console.log("new category id = " + rows[0][0].id);
                const currentCategoryId = rows[0][0].id;
                populateCategoryIndicators(program.categories[i], currentCategoryId);
            });
    }
}

function populateCategoryIndicators(category, categoryId) {
    console.log(`categoryId = ${categoryId}`);
    console.log(category);
    for(let i = 0; i < category.indicators.length; i++) {
        console.log("creating indicator in category: " + i);
        makeDbCallAsPromise("CALL createIndicatorInCategory('" + category.indicators[i].id + "', '" + i + "', '" + categoryId + "')")
    }
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
