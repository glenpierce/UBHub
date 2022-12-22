const express = require('express');
const router = express.Router();
const session = require('client-sessions');
const app = express();
const config = require('../config.js');
const {makeDbCallAsPromise} = require("../ConnectionPool");

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

module.exports = router;