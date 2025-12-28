import express from 'express';
import mysql from 'mysql2';
const router = express.Router();
import path from 'path';
import request from 'request';
import config from '../config.js';

/* GET home page. */
router.get('/', function(req, res, next) {
    // if(req.session && req.session.user)
    //     return res.redirect('indicators');
    // else
    res.render('resources', {username: req.session.user});
});


export default router;