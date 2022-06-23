const express = require('express');
const {makeDbCallAsPromise} = require("../ConnectionPool");
const router = express.Router();

router.get('/', function(req, res, next) {
    const queryString = 'CALL getAllUploadsByUser("' + req.session.user + '")';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            data = JSON.stringify(rows[0]);
            res.render('yourUploads', {fromServer:data, username: req.session.user});
        });
});

module.exports = router;