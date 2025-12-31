import express from 'express';
import mysql from 'mysql2';
const router = express.Router();
import path from 'path';
import config from '../config.js';

router.get('/', function(req, res, next) {
    console.log("get login");
    res.render('login');
});

export default router;


//todo: fix mapping of uploads to my uploads and map
//todo: allow editing of an upload
//todo: increase information capture from email signup

//todo: logout
//todo: make maps conform to spec in pptx doc
//todo: fix recaptcha on create user