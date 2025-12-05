import express from 'express';
const router = express.Router();

router.get('/', function(req, res) {
    res.render('spreadsheet', {
        tables: ['indicators', 'categories', 'indicatorValues']
    });
});

export default router;