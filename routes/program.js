var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var fs = require("fs");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

//todo: create sub indicator description

router.get('/', function (req, res, next) {
    if(req.query.newId) {
        let emptyObject = JSON.stringify({data:""});
        switch (req.query.newId) {
            case "1":
                res.render('ubifProgram', {username: req.session.user, id: req.query.newId, dataFromServer:emptyObject});
                return;
            default:
                let programData = {};
                let queryString = "select * from programs where id = " + req.query.newId + " and author = '" + req.session.user + "';";
                makeDbCallAsPromise(queryString)
                    .then(rows => {
                        let queryString = "select * from categories where program = " + req.query.newId + ";";
                        makeDbCallAsPromise(queryString)
                            .then(rows => {
                                programData.categories = rows;
                                let queryString = "select * from indicators where (categoryId = " + rows[0].id + ")";
                                for(let i = 1; i < rows.length; i += 1) {
                                    queryString += " OR (categoryId = " + rows[i].id + ")";
                                }
                                queryString += ";";
                                makeDbCallAsPromise(queryString)
                                    .then(rows => {
                                        programData.indicators = rows;
                                        programData = JSON.stringify(programData);
                                        res.render('program', {username: req.session.user, id: req.query.newId, programData:programData});
                                    });
                            });
                    });
                return;
        }
    } else {
        let queryString = "select * from userData where id = " + req.query.id + ";";
        makeDbCallAsPromise(queryString)
            .then(rows => {
                let jsonToSend = rows[0].jsonData;
                if(req.session.user == rows[0].userEmail) {
                    if(rows[0].program == "1") {
                        res.render('ubifProgram', {username: req.session.user, id: req.query.id, dataFromServer:jsonToSend});
                    } else {
                        res.render('program', {
                            username: req.session.user,
                            id: req.query.id,
                            dataFromServer: jsonToSend
                        });
                    }
                } else {
                    console.log("user mismatch in program.js: " + req.session.user + " " + rows[0]);
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
