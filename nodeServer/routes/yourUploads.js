import express from 'express';
import {makeDbCallAsPromise} from '../ConnectionPool.js';
const router = express.Router();

router.get('/', function(req, res, next) {
    const queryString = 'CALL getAllUploadsByUser("' + req.session.user + '")';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            data = JSON.stringify(rows[0]);
            res.render('yourUploads', {fromServer:data, username: req.session.user});
        });
});

export default router;