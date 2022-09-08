const express = require('express');
const router = express.Router();
const session = require('client-sessions');
const environment = require('../environment.js');
const app = express();
const {makeDbCallAsPromise} = require("../ConnectionPool");

app.use(session({
    cookieName: 'session',
    secret: environment.secret,
    expires: new Date(Date.now() + (environment.expires))
}));

router.get('/', function(req, res, next) {
    res.render('createIndicator', {username:req.session.user});
});

router.post('/', function(req, res) {
    if (req.session && req.session.user) {
        const queryString = "CALL createIndicator('" + req.body.name + "', '" + req.body.archetype + "', '" + req.body.user + "');";
        makeDbCallAsPromise(queryString)
            .then(rows => {
                res.status(200).json({indicatorName: rows[0][0].indicatorName, id: rows[0][0].id});
                res.end();
            });
    } else {
        console.log("not logged in");
    }
});

module.exports = router;