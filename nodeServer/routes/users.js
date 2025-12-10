import express from 'express';
const router = express.Router();
import mysql from 'mysql';
import bcrypt from 'bcryptjs';
import clientSessions from 'client-sessions';

const app = express();

import config from '../config.js';

// app.use(clientSessions({
//     cookieName: 'session',
//     secret: config.secret,
//     cookie: {
//         maxAge: new Date(Date.now() + (config.expires))
//     }
// }));

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', function(req, res){

    console.log('login request received');

    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query('CALL login("' + req.body.username + '")', function(err, rows, fields) {
        if (!err && rows[0][0] != undefined) {
            // console.log(rows);
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, response) {
                // console.log(response);
                if(response){
                    req.session.user = req.body.username;
                    return res.send('/dashboard');
                } else {
                    return res.send('/login');
                }
            });
        } else {
            console.log('Error while performing Query.');
            return res.send('/login');
        }
    });

    connection.end();
});

export default router;
