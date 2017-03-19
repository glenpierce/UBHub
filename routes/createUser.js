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

    console.log('POST request received');
    console.log(req.body);
    console.log(req.body.username);

    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(req.body.password, salt);

    if(isSafeSQL(req.body.username)) {

        connection.connect();

//        connection.query('SELECT email, id from Users WHERE email = "' + req.body.username + '"', function (err, rows, fields) {
        connection.query('CALL createUser("' + req.body.username + '", "' + hash + '")', function(err, rows, fields){
            if (!err) {
                console.log('The user db has created a user: ', rows);

            } else {
                console.log('Error while performing Query.');
            }
        });

        connection.end();


        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('server says: post request received');
    } else {

    }
});

var isSafeSQL = function(userInput){
    return true;
    // return(!userInput.contains("'"));
};

module.exports = router;