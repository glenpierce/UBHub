import express from 'express';
import mysql from 'mysql';
const router = express.Router();
import path from 'path';
import request from 'request';
import config from '../config.js';

router.get('/', function(req, res, next) {
    // if (req.session.user) {
        res.render('gis', {username: req.session.user});
    // } else {
    //     res.writeHead(403, {'Content-Type': 'text/html'});
    //     res.write('response');
    //     res.end();
    // }
});

export default router;
