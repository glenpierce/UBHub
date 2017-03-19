var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', function(req, res){

    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : process.argv[2],
        database : 'epistemolog'
    });

    console.log('POST request received');
    // console.log(req.body);
    // console.log(req.body.username);

    if(isSafeSQL(req.body.username)) {

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
    } else {

    }
});

router.get('login', function(req, res, next) {
    //check password
    //if correct
    //res.send();
    // res.send('respond with a resource' + req);
    // console.log("responding" + req);
});

var isSafeSQL = function(userInput){
    return true;
    // return(!userInput.contains("'"));
};

module.exports = router;
