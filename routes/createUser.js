var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');

router.post('/', function(req, res){

    console.log("creating user");

    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : process.argv[2],
        database : 'epistemolog'
    });

    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(req.body.password, salt);

    connection.connect();

    connection.query('CALL createUser("' + req.body.username + '", "' + hash + '")', function(err, rows, fields){
        if (!err) {
            console.log('The user db has created a user: ', JSON.stringify(rows));

        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('server says: post request received');
});

module.exports = router;