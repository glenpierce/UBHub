const express = require('express');
const router = express.Router();
const session = require('client-sessions');

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

router.get('/', function(req, res, next) {
    res.render('createLocation', {username:req.session.user});
});

router.post('/', function(req, res){
    console.log(req.body);

    const queryString = 'call createSite(\'' + req.body.siteName + '\', \'' + req.session.user + '\')';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            console.log(rows);
            res.send('dashboard');
        });
});

module.exports = router;