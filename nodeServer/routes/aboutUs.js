import express from 'express';
const router = express.Router();

router.get('/', function(req, res, next) {
    res.render('aboutUs', {username: req.session.user});
});

export default router;
