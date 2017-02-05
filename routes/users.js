var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
  console.log("responding")
});

router.get('login', function(req, res, next) {
    //check password
    //if correct
    //res.send();
    res.send('respond with a resource');
    console.log("responding");
});

module.exports = router;
