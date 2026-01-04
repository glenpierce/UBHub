import express from 'express';
const router = express.Router();
import { pool } from '../ConnectionPool.js';
import bcrypt from 'bcryptjs';
import config from '../config.js';

router.get('/', function(req, res, next) {
  if(req.session.user) {
    res.render('account', {username: req.session.user});
  } else {
    res.render('home', {username: req.session.user});
  }
});

router.post('/update', function(req, res, next) {
  if(req.session.user) {

  }
})

router.post('/resetPassword', async function (req, res) {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('CALL login(?)', [req.session.user]);
      connection.release();

      if (rows && rows[0] && rows[0][0]) {
        const storedHash = rows[0][0].hashedPassword;

        const match = await new Promise((resolve, reject) => {
          bcrypt.compare(req.body.oldPassword, storedHash, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });

        if (match) {
          const salt = bcrypt.genSaltSync(10) + req.session.user.toLowerCase() + config.salt;
          const hash = bcrypt.hashSync(req.body.newPassword, salt);

          const updateQuery = 'UPDATE users SET hashedPassword = ? WHERE email = ?';
          console.log(updateQuery);

          const updateConnection = await pool.getConnection();
          try {
            await updateConnection.query(updateQuery, [hash, req.session.user]);
            updateConnection.release();
            return res.send(true);
          } catch (updateErr) {
            updateConnection.release();
            console.error(updateErr);
            return res.send(false);
          }
        } else {
          return res.send(false);
        }
      } else {
        console.log('Error while performing password reset login Query.');
        return res.send(false);
      }
    } catch (queryError) {
      try {
        connection.release();
      } catch (connectionReleaseError) {
        console.error(connectionReleaseError);
      }
      console.error(queryError);
      return res.send(false);
    }
  } catch (connectionError) {
    console.error(connectionError);
    return res.send(false);
  }
});

router.get('/logout', function (req, res, next) {
    req.session.reset();
    res.render('home');
});

export default router;
