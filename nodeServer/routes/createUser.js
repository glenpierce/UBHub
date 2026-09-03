import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import preApprovedUser from './preApprovedUser.json' with { type: 'json' };
import { sendAdminNotification } from '../services/mailer.js';
import { generatePasswordHash } from '../services/passwordUtils.js';

router.get('/', function(req, res) {
  res.render('createUser', {errorFromServer:false});
});

router.post('/', async function(req, res) {
  try {
    const userIsUnique = await isUserEmailUnique(req, res);
    if (!userIsUnique) {
      res.render('createUser', {errorFromServer: true});
      return;
    }

    await createUser(req, res);
  } catch (error) {
    console.error('Unexpected error during user creation flow:', error);
    res.render('createUser', {errorFromServer: true});
  }

});

function isUserEmailUnique(req, res){
  req.body.email = normalizeAndSanitizeEmail(req.body.email);
  if (!req.body.email) {
    console.error('Invalid email provided to isUserEmailUnique:', String(req.body.email));
    res.render('createUser', {errorFromServer: true});
    return Promise.resolve(false);
  }

  const queryString = 'select * from users where email = ?';
  return makeDbCallAsPromise(queryString, [req.body.email])
    .then(rows => {
        if (!Array.isArray(rows)) {
          console.warn('isUserEmailUnique: unexpected rows result from DB', rows);
          res.render('createUser', {errorFromServer: true});
          return false;
        }

        if (rows.length === 0) {
          return true;
        }

        console.log('Email already exists in users table:', req.body.email);
        return false;
    })
    .catch(error => {
      console.error('Error checking email uniqueness:', error);
      res.render('createUser', {errorFromServer: true});
      return false;
    });
}

function createUser(req, res) {
  console.log("creating user");

  const hash = generatePasswordHash(req.body.password, req.body.email);

  const queryString = 'CALL createUser(?, ?, ?, ?, ?, ?, ?)';
  const params = [req.body.email, hash, req.body.alias, req.body.userAddress, req.body.title, req.body.institution, req.body.whatsAppNumber];

  return makeDbCallAsPromise(queryString, params)
    .then(rows => {
      // pass the normalized email string (not JSON.stringify of rows) to setUserPrivileges
      setUserPrivileges(req.body.email);
      console.log('The user db has created a user: ', JSON.stringify(rows));
      // Redirect to login with a query flag so the login page can display a success popup
      res.redirect('/login?created=1');

      // Send admin notification asynchronously (don't block response)
      const createdAt = new Date().toISOString();
      sendAdminNotification({
        newUserEmail: req.body.email,
        alias: req.body.alias,
        institution: req.body.institution,
        title: req.body.title,
        createdAt
      });

    return rows;
    })
      .catch(error => {
        console.error('Error creating user:', error);
        res.render('createUser', {errorFromServer: true});
        throw error;
      });
}

function setUserPrivileges(normalizedEmail) {
  if (!normalizedEmail) {
    console.warn('setUserPrivileges called without an email');
    return;
  }

  const privileges = preApprovedUser[normalizedEmail];
  // Only promote above the default User level (1); level 0 is reserved for Contacts created
  // without a password and should not be assigned here.
  if (privileges == null || privileges < 2) {
    console.log('Email is not on the pre approval list for elevated privileges, skipping for user: ', normalizedEmail);
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
  const normalizedEmail = email.replace(/[[\x00-\x1F\x7F"'\\;]/g, '');

  if (normalizedEmail === email) {
    return normalizedEmail;
  } else {
    return undefined;
  }
}

export default router;
