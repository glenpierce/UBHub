const express = require('express');
const router = express.Router();
var fs = require("fs");

router.get('/', function(req, res, next) {
    var contents = fs.readFileSync("./views/iNaturalistData.json");
    var jsonContent = JSON.parse(contents);
    console.log(jsonContent);

    res.render('iNaturalist', {data:contents});
});

module.exports = router;