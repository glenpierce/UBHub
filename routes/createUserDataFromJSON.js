let express = require('express');
let router = express.Router();
let mysql = require('mysql');
let session = require('client-sessions');
let path = require("path");

let app = express();

let config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

router.post('/', function(req, res){
    makeDbCallAsPromise("CALL getSelectedSiteByUserQuery('" + req.session.user + "');").then(
        (selectedSite) => {
            let id = req.body.id;
            if(id == null) {
                req.body.id = Date.now();
            }
            let data = JSON.stringify(req.body).replace(/'/g, '\\\'');
            data = data.replace(/https?\:\/\//gi, "");
            let queryString;
            if(id == null) {
                id = req.body.id;
                queryString = "INSERT INTO userData (site, program, userEmail, jsonData, id) VALUES ('" + selectedSite[0][0].id + "', '" + 1 + "', '" + req.session.user + "', '" + data + "', " + id + ");";
            } else {
                queryString = "update userData set jsonData = '" + data + "' where id = " + id + ";";
            }
            makeDbCallAsPromise(queryString).then(() => {
                let response = id.toString();
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(response);
                res.end();
            });
        }
    );
});


makeDbCallAsPromise = function(queryString) {
    return new Promise((resolve, reject) => {
        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        query = queryString;
        console.log(query);
        connection.query(query, function (err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log('Error while performing Query.');
                console.log(err.code);
                console.log(err.message);
                reject(err);
            }
        });
        connection.end();
    })
};

module.exports = router;