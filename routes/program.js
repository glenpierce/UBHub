const express = require('express');
const router = express.Router();
const session = require('client-sessions');
const service = require('../services/dataService');
const model = require('../public/javascripts/model');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const app = express();

const config = require('../config.js');
const {makeDbCallAsPromise} = require("../ConnectionPool");

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

//todo: create sub indicator description

router.post('/submit', urlencodedParser, (req, res) => {
    console.log('Got body:', req.body);
    const query = `Call getSelectedSiteByUserQuery('${req.session.user}')`;
    makeDbCallAsPromise(query).then(function (values) {
        const site = values[0][0];
        const year = req.body.header.year;
        const name = req.body.header.name;
        if(req.body.values != null) {
            Object.keys(req.body.values).forEach(function (key) {
                console.log(key, req.body.values[key]);
                let value = req.body.values[key];
                if (value == null || value == '') {
                    value = 0;
                }
                const userDataId = req.session.programInstanceId;
                let queryString = 'INSERT into userData (id, userEmail, site, program, indicatorId, indicatorValue, name, year) VALUES' +
                    ' (' + userDataId + ', \'' + req.session.user + '\', ' + site.id + ', ' + req.session.programId + ', ' + key + ', ' + value + ', \'' + name + '\', ' + year + ');';
                console.log(queryString);
                makeDbCallAsPromise(queryString);
            });
        }
    });
    // res.redirect('/dashboard');
    res.sendStatus(200);
});

router.get('/', function (req, res, next) {
    // model.myFunction("asdf");
    if(req.query.newId) {
        let emptyObject = JSON.stringify({data:""});
        switch (req.query.newId) {
            case "1":
                res.render('ubifProgram', {username: req.session.user, id: req.query.newId, dataFromServer:emptyObject});
                return;
            default:
                let programData = {id:req.query.newId};
                req.session.programId = req.query.newId;
                req.session.programInstanceId = Date.now();
                let queryString = `select * from programs where id = '${req.query.newId}' and author = '${req.session.user}';`;
                makeDbCallAsPromise(queryString)
                .then(program => {
                    let queryString = `select * from categories where program = ${req.query.newId};`;
                    return makeDbCallAsPromise(queryString);
                })
                .then(categories => {
                    programData.categories = categories;
                    let queryString = `select * from indicatorInCategory where (categoryId = ${categories[0].id})`;
                    for(let i = 1; i < categories.length; i += 1) {
                        queryString += ` OR (categoryId = ${categories[i].id})`;
                    }
                    queryString += `;`;
                    return makeDbCallAsPromise(queryString);
                })
                .then(indicatorIds => {
                    programData.indicatorIds = indicatorIds;
                    let queryString = `select * from indicators where (id = ${indicatorIds[0].indicatorTemplateId})`;
                    for(let i = 1; i < indicatorIds.length; i += 1) {
                        queryString += ` OR (id = ${indicatorIds[i].indicatorTemplateId})`;
                    }
                    queryString += `;`;
                    return makeDbCallAsPromise(queryString);
                })
                .then(indicators => {
                    programData.indicators = indicators;
                    let queryString = `select * from indicatorValues where (subIndicator = ${indicators[0].id})`;
                    for(let i = 1; i < indicators.length; i += 1) {
                        queryString += ` OR (subIndicator = ${indicators[i].id})`;
                    }
                    queryString += `;`;
                    return makeDbCallAsPromise(queryString);
                })
                .then(indicatorValues => {
                    programData.indicatorValues = indicatorValues;
                    programData = JSON.stringify(programData);
                    res.render('program', {username: req.session.user, id: req.query.newId, programData:programData});
                });
                return;
        }
    } else {
        //todo: add authentication to avoid showing user data to non-permissioned users
        let queryString = `select * from userData where id = ${req.query.id};`;
        makeDbCallAsPromise(queryString)
            .then(rows => {
                let jsonToSend = rows[0].jsonData;
                if(req.session.user == rows[0].userEmail) {
                    if(rows[0].program == '1') {
                        res.render('ubifProgram', {username: req.session.user, id: req.query.id, dataFromServer:jsonToSend});
                    } else {
                        res.render('program', {
                            username: req.session.user,
                            id: req.query.id,
                            dataFromServer: jsonToSend
                        });
                    }
                } else {
                    console.log(`user mismatch in program.js: ${req.session.user} ${rows[0]}`);
                }
            });
        //get userData by id, confirm user email from db matches authenticated user making request
        //then
        //switch statement by userData.program determines which .jade file to render (we just have UBIF 2.0 for now
        //res.render 'jadetemplate', {userdata}
        // let jsonToSend = JSON.stringify(jsonContent);
    }
});

module.exports = router;
