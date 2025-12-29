import express from 'express';
const router = express.Router();
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import clientSessions from 'client-sessions';
import { makeDbCallAsPromise } from '../ConnectionPool.js';

const app = express();

import config from '../config.js';

app.use(clientSessions({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', async function (req, res) {

    console.log('login request received :)');

    try {
        const rows = await makeDbCallAsPromise('CALL login(?)', [req.body.username]);

        if (!rows) {
            console.log("no rows found for user");
            return res.send('/login');
        }

        const hashedPassword = rows[0].hashedPassword;

        bcrypt.compare(req.body.password, hashedPassword, function (error, result) {
            if (error) {
                console.error('error occurred:', error);
                return res.send('/login');
            }
            if (result) {
                req.session.user = req.body.username;
                return res.send('/spreadSheet');
            } else {
                console.error('No result, error? :', error);
                return res.send('/login');
            }
        });

    } catch (error) {
        console.error(error);
        return res.send('/login');
    }
});

export default router;
