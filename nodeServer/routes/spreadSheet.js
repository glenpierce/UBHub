const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    res.render('spreadsheet', {
        tables: ['indicators', 'categories', 'indicatorValues']
    });
});

module.exports = router;