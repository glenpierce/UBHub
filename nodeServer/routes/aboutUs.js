const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    res.render('aboutUs', {username: req.session.user});
});

module.exports = router;
