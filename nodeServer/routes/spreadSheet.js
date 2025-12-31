import express from 'express';
const router = express.Router();

router.get('/', function(req, res) {
    res.render('spreadSheet', {
        tables: ['locations', 'documents', 'participation', 'mapButtons']
    });
});

export default router;