var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var session = require('client-sessions');

var app = express();

app.use(session({
    cookieName: 'session',
    secret: process.argv[3],
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', function(req, res){

    console.log('login request received');

    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : process.argv[2],
        database : 'epistemolog'
    });

    connection.connect();

    connection.query('CALL login("' + req.body.username + '")', function(err, rows, fields){
        if (!err && rows[0][0] != undefined) {
            console.log(rows);
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, response) {
                console.log(response);
                if(response){
                    req.session.user = req.body.username;
                    return res.send('/dashboard');
                }
            });
        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();


    // res.writeHead(200, {'Content-Type': 'text/html'});
    // res.end('server says: post request received');
});

module.exports = router;
