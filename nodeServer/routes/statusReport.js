import express from 'express';
import mysql from 'mysql2';
const router = express.Router();
import path from 'path';
import request from 'request';
import config from '../config.js';

router.get('/', function(req, res, next) {
    res.render('statusReport', {username: req.session.user});
});

export default router;