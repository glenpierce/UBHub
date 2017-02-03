var express = require('express');
var mysql = require('mysql');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    // var connection = mysql.createConnection({
    //     host     : 'localhost',
    //     user     : 'root',
    //     password : 'my-secret-pw',
    //     database : 'epistemolog'
    // });
    //
    // connection.connect();
    //
    //   var query = connection.query('SELECT * FROM Users',function(err, rows){
    //       if(err)
    //           console.log("Error Selecting : %s ", err );
    //
    //       for (var i in rows) {
    //           console.log(rows[i].email);
    //       }

          res.render('index',{title:"The thing I'm working on"});
      // });

    // connection.end();
});

module.exports = router;
