var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', function(req, res){
    console.log('POST request received');
    console.log(req.body);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('server says: post request received');
});

router.get('login', function(req, res, next) {
    //check password
    //if correct
    //res.send();
    // res.send('respond with a resource' + req);
    // console.log("responding" + req);
});

module.exports = router;
