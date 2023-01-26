const AWS = require('aws-sdk');
const config = require('../config.js');
const express = require("express");
const session = require("client-sessions");
const router = express.Router();

const app = express();

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

router.get('/start', function(req, res, next) {
    if (req.session && req.session.user && req.session.user === "user") {
        startPythonServer();
    } else {
        req.session.reset();
        res.redirect('/');
    }
});

function startPythonServer() {

    AWS.config.update({region: config.region});

    const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

    const params = {
        InstanceIds: [
            config.pythonInstanceID
        ]
    };

    ec2.startInstances(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            console.log(data);
        }
    });
}

module.exports = router;
