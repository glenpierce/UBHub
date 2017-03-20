var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');

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
        if (!err) {
            console.log(rows);
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, res) {
                console.log(res);
            });
        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();


    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('server says: post request received');
});

module.exports = router;
