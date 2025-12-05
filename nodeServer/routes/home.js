import express from 'express';
const router = express.Router();
import {makeDbCallAsPromise} from '../ConnectionPool.js';

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

export default router;
