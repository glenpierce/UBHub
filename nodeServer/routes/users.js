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
    const rows = await makeDbCallAsPromise('CALL login(?)', [req.body.username]);

    if (!rows) {
      console.log("no rows found for user");
      return res.send('/login');
    }

    const hashedPassword = rows[0].hashedPassword;

    bcrypt.compare(req.body.password, hashedPassword, function (error, result) {
      if (error) {
        console.error('error occurred:', error);
        return res.send('/login');
      }
      if (result) {
        req.session.user = rows[0].alias;
        req.session.privileges = rows[0].privileges;
        return res.send('/spreadSheet', { user: req.session.user });
      } else {
        console.error('No result, error? :', error);
        return res.send('/login');
      }
    });

  } catch (error) {
    console.error(error);
    return res.send('/login');
  }
});

export default router;
