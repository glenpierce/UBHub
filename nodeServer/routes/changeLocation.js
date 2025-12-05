import express from 'express';
const router = express.Router();
import clientSession from 'client-sessions';
import config from '../config.js';
import {makeDbCallAsPromise} from '../ConnectionPool.js';
const app = express();

app.use(clientSession({
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

export default router;
