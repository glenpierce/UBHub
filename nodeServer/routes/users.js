import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import { makeDbCallAsPromise } from '../ConnectionPool.js';

const app = express();

router.get('/', function(req, res, next) {
  res.send('respond with req');
});

router.post('/', async function (req, res) {

  console.log('login request received');

  try {
    const rows = await makeDbCallAsPromise('CALL login(?)', [req.body.email]);

    if (!rows || rows.length === 0) {
      console.log("no rows found for user");
      return res.redirect('/login');
    }

    const userRow = rows[0];
    const hashedPassword = userRow.hashedPassword;

    bcrypt.compare(req.body.password, hashedPassword, function (error, result) {
      if (error) {
        console.error('error occurred:', error);
        return res.redirect('/login');
      }
      if (result) {
        req.session.user = userRow.alias;
        req.session.email = userRow.email;
        // req.session.email = rows[0].email; // todo: update the login function to return email
        req.session.privileges = userRow.privileges;
        return res.redirect('/dataManagement');
      } else {
        console.error('No result, error? :', error);
        return res.redirect('/login');
      }
    });

  } catch (error) {
    console.error(error);
    return res.redirect('/login');
  }
});

export default router;
