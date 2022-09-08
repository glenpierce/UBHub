const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const session = require('client-sessions');

const app = express();

const environment = require('../environment.js');

app.use(session({
    cookieName: 'session',
    secret: environment.secret,
    expires: new Date(Date.now() + (environment.expires))
}));

router.post('/', function(req, res) {
    let id = JSON.parse(req.body.responseFromServer).id;

    if (req.session && req.session.user) {
        for(let indicatorIndex in req.body.indicatorValues) {
            let type;
            switch (req.body.indicatorValues[indicatorIndex].type) {
                case 'boolean':
                    type = 1;
                    break;
                case 'float':
                    type = 2;
                    break;

                //TODO new case
                default:
                    type = 0;
                    break;
            }
            const query = "CALL createIndicatorValue('" + req.body.indicatorValues[indicatorIndex].name + "', " + id + ", " + type + ");";

            const connection = mysql.createConnection({
                host: environment.rdsHost,
                user: environment.rdsUser,
                password: environment.rdsPassword,
                database: environment.rdsDatabase
            });

            connection.connect();
            connection.query(query, function (err, rows, fields) {
                if (!err) {
                    // res.status(200).json({rows});
                    // res.end();
                } else {
                    console.log('Error while performing Query.');
                    console.log(query);
                    console.log(err.code);
                    console.log(err.message);
                }
            });
            connection.end();
        }
        res.status(200);
        res.end();
    } else {
        console.log("not logged in");
    }
});

module.exports = router;
