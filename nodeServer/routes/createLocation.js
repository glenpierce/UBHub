import express from 'express';
const router = express.Router();
import clientSession from 'client-sessions';

const app = express();

import config from '../config.js';
import {makeDbCallAsPromise} from '../ConnectionPool.js';

app.use(clientSession({
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

export default router;