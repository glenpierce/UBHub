const express = require('express');
const router = express.Router();
const session = require('client-sessions');
const config = require('../config.js');
const {makeDbCallAsPromise} = require("../ConnectionPool");
const app = express();

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    expires: new Date(Date.now() + (config.expires))
}));

router.get('/', function(req, res, next) {
    let sites = "";

    const queryString = `Call getSitesByUser('${req.session.user}')`;
    makeDbCallAsPromise(queryString)
        .then(rows => {
            sites = rows[0];
            res.render('changeLocation', {sites:JSON.stringify(sites), username:req.session.user});
    });
});

router.post('/', function(req, res){
});

module.exports = router;
