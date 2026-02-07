import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import preApprovedUser from './preApprovedUser.json';

router.get('/', function(req, res) {
  res.render('createUser', {errorFromServer:false});
});

router.post('/', function(req, res) {
  isUserEmailUnique(req, res);
});

function isUserEmailUnique(req, res){
  // normalize and sanitize the email for consistent and safe lookups
  req.body.email = normalizeAndSanitizeEmail(req.body.email);
  if (!req.body.email) {
    console.error('Invalid email provided to isUserEmailUnique:', String(req.body.email));
    res.render('createUser', {errorFromServer: true});
    return;
  }

  const queryString = 'select * from users where email = ?';
  makeDbCallAsPromise(queryString, [req.body.email])
    .then(rows => {
        createUser(req, res);
    })
    .catch(error => {
      console.error('Error checking email uniqueness:', error);
      res.render('createUser', {errorFromServer: true});
    });
}

function createUser(req, res) {
  console.log("creating user");

  const salt = bcrypt.genSaltSync(10) + req.body.email.toLowerCase() + config.salt;
  const hash = bcrypt.hashSync(req.body.password, salt);

  const queryString = 'CALL createUser(?, ?, ?, ?, ?, ?, ?)';
  const params = [req.body.email, hash, req.body.alias, req.body.userAddress, req.body.title, req.body.institution, req.body.whatsAppNumber];

  makeDbCallAsPromise(queryString, params)
    .then(rows => {
      // pass the normalized email string (not JSON.stringify of rows) to setUserPrivileges
      setUserPrivileges(req.body.email);
      console.log('The user db has created a user: ', JSON.stringify(rows));
      res.redirect('login');
    })
      .catch(error => {
        console.error('Error creating user:', error);
        res.render('createUser', {errorFromServer: true});
      });
}

function setUserPrivileges(normalizedEmail) {
  // email is expected to be a normalized (lowercase, trimmed) string
  if (!normalizedEmail) {
    console.warn('setUserPrivileges called without an email');
    return;
  }

  const privileges = preApprovedUser[normalizedEmail];
  if (!privileges && privileges !== 0) {
    console.log('Email is not on the pre approval list, skipping setting permissions for user: ', normalizedEmail);
    return;
  }

  const permissionsQuery = 'update users set privileges = ? where email = ?;';
  makeDbCallAsPromise(permissionsQuery, [privileges, normalizedEmail])
    .then(() => {
      console.log('The user db has set permissions for the user: ', normalizedEmail, ' -> privileges:', privileges);
    })
      .catch(error => {
        console.error('Error setting user permissions: ', error);
      });
}

function normalizeAndSanitizeEmail(rawEmail) {
  if (rawEmail === undefined || rawEmail === null) {
    return undefined;
  }
  const email = String(rawEmail).toLowerCase().trim();
  const normalizedEmail = email.replace(/[\x00-\x1F\x7F"'\\;]/g, '');

  if (normalizedEmail === email) {
    return normalizedEmail;
  } else {
    return undefined;
  }
}

export default router;
