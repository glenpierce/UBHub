import express from 'express';
const router = express.Router();

router.get('/', function(req, res, next) {
    res.redirect("https://ubhuborg.wixsite.com/aboutus");
});

export default router;
