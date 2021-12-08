const express = require('express');
const router = express.Router();
const {makeDbCallAsPromise} = require("../ConnectionPool");

router.get('/', function(req, res, next) {

    const queryString = 'SELECT * from locations limit 100';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            res.render('home', {mapData:JSON.stringify(rows), username: req.session.user});
        })
        .catch(error => {
            res.render('home', {mapData:null, username: req.session.user});
        })
});

module.exports = router;
