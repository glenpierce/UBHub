import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { makeDbCallAsPromise } from '../ConnectionPool.js';

router.get('/', function(req, res, next){
  res.render('createUser', {errorFromServer:false});
});

router.post('/', function(req, res){
  isUserEmailUnique(req, res);
});

function isUserEmailUnique(req, res){
  const queryString = "select * from users where email = '" + req.body.email + "';";
  makeDbCallAsPromise(queryString)
    .then(rows => {
      if(rows.size) {
        res.render('createUser', {errorFromServer: true});
      } else {
        createUser(req, res);
      }
    });
}

function createUser(req, res) {
  console.log("creating user");

  const salt = bcrypt.genSaltSync(10) + req.body.email.toLowerCase() + config.salt;
  const hash = bcrypt.hashSync(req.body.password, salt);

  const queryString = 'CALL createUser("' + req.body.email + '", "' + hash + '", "' + req.body.alias + '", "' + req.body.userAddress + '", "' + req.body.title + '", "' + req.body.institution + '", "' + req.body.whatsAppNumber + '")';
  makeDbCallAsPromise(queryString)
    .then(rows => {
      console.log('The user db has created a user: ', JSON.stringify(rows));
      res.redirect('login');
    })
      .catch(error => {
        res.render('createUser', {errorFromServer: true});
      });
}

export default router;
