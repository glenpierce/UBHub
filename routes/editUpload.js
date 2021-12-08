const express = require('express');
const {makeDbCallAsPromise} = require("../ConnectionPool");
const router = express.Router();

let id;

router.get('/', function(req, res, next) {
    id = req.query.id;
    const queryString = 'CALL getUploadById(' + id + ')';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            if(req.body.username === rows.user) {
                data = rows[0][0];
                const stringFromServer = JSON.stringify(rows[0][0]);
                console.log(data);
                res.render('editUpload', {
                    fromServer: data,
                    stringFromServer: stringFromServer,
                    username: req.session.user
                });
            } else {
                res.redirect('login');
            }
        });
});

router.post('/', function(req, res) {
    console.log("edit upload");
    const queryString = 'CALL getUploadById("' + id + '")';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            if(req.body.username === rows.user) {
                updateUpload(req, res);
                console.log("correct user");
            } else {
                res.redirect('login');
                console.log("wrong user");
            }
        });
});

function updateUpload(req, res) {
    // const queryString = 'CALL updateUpload("' + req.body.locationId + '", "' + req.body.location + '", "' + req.body.title + '", "' + req.session.user + '", "' + req.body.location + '", "' + req.body.scale + '", \'' + JSON.stringify(req.body) + '\')';
    const queryString = 'UPDATE locations SET myJson = \'' + JSON.stringify(req.body) + '\' WHERE id = ' + id + ';';
    console.log(queryString);

    makeDbCallAsPromise(queryString)
        .then(rows => {
            res.redirect('yourUploads');
        });
}

module.exports = router;