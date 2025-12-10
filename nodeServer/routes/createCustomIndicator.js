import express from 'express';
const router = express.Router();
import clientSession from 'client-sessions';
import config from '../config.js';
const app = express();
import {makeDbCallAsPromise} from '../ConnectionPool.js';

// app.use(clientSession({
//     cookieName: 'session',
//     secret: config.secret,
//     expires: new Date(Date.now() + (config.expires))
// }));

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

export default router;