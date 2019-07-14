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

router.get('/', function (req, res, next) {
    if(req.query.newId) {
        switch (req.query.newId) {
            case "1":
                let emptyObject = JSON.stringify({data:""});
                res.render('program', {username: req.session.user, id: req.query.newId, dataFromServer:emptyObject});
                return;
            default:
                console.log("incorrect newId query");
                console.log(req.query.newId);
                return;
        }
    } else {
        let queryString = "select * from userData where id = " + req.query.id + ";";
        makeDbCallAsPromise(queryString)
            .then(rows => {
                let jsonToSend = rows[0].jsonData;
                if(req.session.user == rows[0].userEmail) {
                    res.render('program', {username: req.session.user, id: req.query.id, dataFromServer:jsonToSend});
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