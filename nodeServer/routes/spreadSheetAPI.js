const express = require('express');
const router = express.Router();
const {makeDbCallAsPromise} = require("../ConnectionPool");

router.get('/table-data/:tableName', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tableName = req.params.tableName;
        // Validate tableName to prevent SQL injection IMPORTANT!!
        const validTableNames = ['indicators', 'categories', 'indicatorValues']; // Add your actual table names

        if (!validTableNames.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        const queryString = `SELECT * FROM ${tableName} LIMIT 1000`;
        const result = await makeDbCallAsPromise(queryString);

        // console.log(result);

        res.json(result);
    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

function isAuthenticated(req, res, next) {
    // return next(); bypass authentication for... being awesome

    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

function isAdmin(req, res, next) {
    // return next(); bypass authentication for... being awesome

    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).json({ error: 'Not authorized' });
}

module.exports = router;